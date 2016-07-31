/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 * @flow
 */

import React, { Component } from 'react';
import {
  AppRegistry,
  StyleSheet,
  Text,
  View,
  TouchableHighlight,
  ToastAndroid,
  Linking,
  Image,
  ScrollView,
  ListView,
  WebView,
  DeviceEventEmitter,
  AsyncStorage,
  ActivityIndicator
} from 'react-native';

import RadioForm, {RadioButton, RadioButtonInput, RadioButtonLabel} from 'react-native-simple-radio-button';

var SC = require('SCClient');

function getDurationString(duration) {
  var res = "";

  var min = Math.floor(duration / 1000 / 60);
  var sec = Math.floor(duration / 1000 - min * 60);

  res += min + ':';
  if (sec < 10) {
    res += '0';
  }
  res += sec;

  return res;
}

function getLikesString(likes) {
  if (likes < 1000) {
    return likes;
  }

  if (likes > 10000) {
    return "" + Math.floor(likes / 1000) + "k";
  }

  return "" + ((Math.floor(likes / 100)) / 10) + "k";
}

class Song extends Component {
  constructor(props) {
    super(props);
  }

  onPress() {
    ToastAndroid.show(this.props.song.permalink_url, ToastAndroid.SHORT);
    Linking.openURL(this.props.song.permalink_url);
  }

  render() {
    return (
      <TouchableHighlight onPress={() => this.onPress()} underlayColor="#dddddd">
        <View style={styles.song_container}>
          <Image source={{uri: this.props.song.artwork_url ? this.props.song.artwork_url.replace(/large/, 't500x500') : null}} style={styles.song_image}/>
          <Image source={{uri: this.props.song.user.avatar_url}} style={styles.user_avatar}/>
          <View style={styles.song_title_container}>
            <Text style={[styles.song_title, {fontSize: 20}]}>{this.props.song.title}</Text>
          </View>
          <View style={{flexDirection: 'row'}}>
            <View style={[styles.song_title_container, {marginRight: 0}]}>
              <Text style={styles.song_title}>{this.props.song.user.username}</Text>
            </View>
            <View style={styles.song_title_container}>
              <Text style={styles.song_title}>{getDurationString(this.props.song.duration)}</Text>
            </View>
          </View>
          <View style={[styles.song_title_container, {marginTop: 5}]}>
            <Text style={styles.song_title}>{getLikesString(this.props.song.likes_count) + ' likes'}</Text>
          </View>
        </View>
      </TouchableHighlight>
    );
  }
}

class DurationSelector extends Component {

  constructor() {
    super();
    this.state = {
      selection: 0,
    }
  }

  componentDidMount() {
  }

  render() {
    var values = [0, 20 * 60 * 1000, 40 * 60 * 1000];
    var radio_props = [
      {label: ' Any  ', value: 0},
      {label: ' 20m+ ', value: 1},
      {label: ' 40m+ ', value: 2},
    ];
    return (
      <View style={{flex: 1, alignItems: 'center', padding: 10}} key="duration">
        <RadioForm
          radio_props={radio_props}
          formHorizontal={true}
          initial={this.state.selection}
          onPress={(value) => {
            this.props.onValueChanged && this.props.onValueChanged(values[value]);
            this.setState({selection: value});
          }}
        />
      </View>
    );
  }
}

class LoadingMoreIndicator extends Component {
  render() {
    if (this.props.isLoading) {
      return (
        <View style={{alignItems: 'center', padding: 20}}>
          <ActivityIndicator animating={true} />
        </View>
      );
    } else {
      return null;
    }
  }
}

class SCList extends Component {

  constructor(props) {
    super(props);

    this.ds = new ListView.DataSource({rowHasChanged: (r1, r2) => r1 !== r2});
    this.state = {
      songs: [],
      fetchMoreUri: null,
      dataSource: this.ds.cloneWithRows([]),
      filterDuration: 0,
      isLoading: false,
    };
  }

  componentDidMount() {
    SC.get('/me/activities', {limit: 10})
      .then(this.handleNewSongsJson.bind(this))
      .done();
    this.setState({isLoading: true});
  }

  handleNewDurationFilter(value) {
    requestAnimationFrame(() => {
      var filtered = this.state.songs
          .filter((song) => song.origin.duration >= value);
      this.setState({
        dataSource: this.ds.cloneWithRows(filtered),
        filterDuration: value,
      });
    });
  }

  handleNewSongsJson(json) {
    var lengthBefore = this.state.songs.length;
    var allSongs = this.state.songs.concat(json.collection);
    var filteredSongs = allSongs
        .filter((song) => song.origin.duration && song.origin.duration >= this.state.filterDuration);
    var filteredLength = filteredSongs.length;

    this.setState({
      fetchMoreUri: json.next_href,
      songs: allSongs,
      dataSource: this.ds.cloneWithRows(filteredSongs),
    });

    if (lengthBefore === filteredLength) {
      this.fetchMoreSongs(json.next_href);
    } else {
      this.setState({isLoading: false});
    }
  }

  fetchMoreSongs(fetchMoreUri) {
    SC.getRaw(fetchMoreUri)
      .then(this.handleNewSongsJson.bind(this))
      .done();
    this.setState({
      fetchMoreUri: null,
      isLoading: true,
    });
  }

  render() {
    return (
      <ListView
        enableEmptySections={true}
        dataSource={this.state.dataSource}
        renderHeader={() => <DurationSelector key="duration" onValueChanged={(value) => this.handleNewDurationFilter(value)}/>}
        renderFooter={() => <LoadingMoreIndicator isLoading={this.state.isLoading} />}
        renderRow={(song) => <Song song={song.origin}/>}
        onEndReached={() => { if (this.state.fetchMoreUri) { this.fetchMoreSongs(this.state.fetchMoreUri) }}}
      />
    );
  }

}

class SoundCloud2 extends Component {

  constructor(props) {
    super(props);

    this.ds = new ListView.DataSource({rowHasChanged: (r1, r2) => r1 !== r2});
    this.state = {
      shouldAuth: false,
      token: null,
    };
  }

  componentDidMount() {
    AsyncStorage.multiGet(['token', 'expires_at'], (err, stores) => {
      var token = stores[0][1];
      var expires_at = stores[1][1];
      console.log("Expires at: " + expires_at + ", now: " + Date.now());
      if (!token || !expires_at || expires_at < Date.now()) {
        this.setState({
          shouldAuth: true,
        });
      } else {
        SC.setToken(token);
        this.setState({
          token: token,
        });
      }
    });
  }

  handleWebViewLoad(e) {
    var url = e.nativeEvent.url;

    var re = /https:\/\/phox.org\/login.*access_token=([0-9a-zA-Z\-]+)/;
    var result = re.exec(url);

    if (!result) {
      return;
    }

    var token = result[1];
    if (!token) {
      throw new Error("Couldn't extract token!");
    }

    re = /https:\/\/phox.org\/login.*expires_in=([0-9]+)/;
    result = re.exec(url);
    var expires_in = result[1];
    if (!expires_in) {
      throw new Error("Couldn't extract expires_in!");
    }

    AsyncStorage.multiSet([['token', token], ['expires_at', '' + (Date.now() + 1000 * parseInt(expires_in))]]);

    SC.setToken(token);
    this.setState({
      shouldAuth: false,
      token: token,
    });
  }

  render() {
    if (this.state.shouldAuth) {
      var uri = 'https://soundcloud.com/connect?client_id=bde272e750aa8584833ec1fbd07bda2b&response_type=token&redirect_uri=https://phox.org/login';
      return (
        <WebView
            source={{uri: uri}}
            onLoadStart={this.handleWebViewLoad.bind(this)}/>
      );
    } else if (this.state.token) {
      return <SCList/>;
    } else {
      return (
        <View style={{flex: 1, alignItems: 'center', justifyContent: 'center'}}>
          <Text style={{fontSize: 28, marginBottom: 30}}>Loading your account...</Text>
          <ActivityIndicator animating={true} size="large" />
        </View>
      );
    }
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  song_title: {
    color: 'white',
  },
  song_title_container: {
    marginTop: 10,
    marginLeft: 10,
    marginRight: 10,
    padding: 5,
    backgroundColor: '#000000aa',
  },
  song_container: {
    flex: 1,
    height: 200,
    alignItems: 'flex-start',
  },
  song_image: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  user_avatar: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    width: 50,
    height: 50,
    borderColor: 'white',
    borderWidth: 2,
  }
});

AppRegistry.registerComponent('SoundCloud2', () => SoundCloud2);
