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

DeviceEventEmitter.addListener('keyboardWillShow', function(e: Event) {
  console.log("Got native event! " + JSON.stringify(e));
});


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
          <View style={styles.song_title_container}>
            <Text style={[styles.song_title, {fontSize: 20}]}>{this.props.song.title}</Text>
          </View>
          <View style={[styles.song_title_container, {marginTop: 5}]}>
            <Text style={styles.song_title}>{getDurationString(this.props.song.duration)}</Text>
          </View>
          <View style={[styles.song_title_container, {marginTop: 5}]}>
            <Text style={styles.song_title}>{this.props.song.likes_count + ' likes'}</Text>
          </View>
        </View>
      </TouchableHighlight>
    );
  }
}

class DurationSelector extends Component {

  render() {
    var radio_props = [
      {label: ' Any  ', value: 0},
      {label: ' 20m+ ', value: 20 * 60 * 1000},
      {label: ' 40m+ ', value: 40 * 60 * 1000},
    ];
    return (
      <View style={{flex: 1, alignItems: 'center', padding: 10}} key="duration">
        <RadioForm
          radio_props={radio_props}
          formHorizontal={true}
          initial={0}
          onPress={(value) => {this.props.onValueChanged && this.props.onValueChanged(value)}}
        />
      </View>
    );
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
    };
  }

  componentDidMount() {
    SC.get('/me/activities', {limit: 5})
      .then(this.handleNewSongsJson.bind(this))
      .done();
  }

  handleNewDurationFilter(value) {
    var filtered = this.state.songs
        .filter((song) => song.origin.duration >= value);
    this.setState({
      dataSource: this.ds.cloneWithRows(filtered),
      filterDuration: value,
    });
  }

  handleNewSongsJson(json) {
    var allSongs = this.state.songs.concat(json.collection);
    var filteredSongs = allSongs
        .filter((song) => song.origin.duration >= this.state.filterDuration);
    this.setState({
      fetchMoreUri: json.next_href,
      songs: allSongs,
      dataSource: this.ds.cloneWithRows(filteredSongs),
    });
  }

  fetchMoreSongs() {
    if (!this.state.fetchMoreUri) {
      return;
    }

    SC.getRaw(this.state.fetchMoreUri)
      .then(this.handleNewSongsJson.bind(this))
      .done();
    this.setState({fetchMoreUri: null});
  }

  render() {
    return (
      <ListView
        enableEmptySections={true}
        dataSource={this.state.dataSource}
        renderHeader={() => <DurationSelector key="duration" onValueChanged={(value) => this.handleNewDurationFilter(value)}/>}
        renderRow={(song) => <Song song={song.origin}/>}
        onEndReached={() => this.fetchMoreSongs()}
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
      if (!token || (expires_at && expires_at < Date.now())) {
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

    AsyncStorage.multiSet([['token', token], ['expires_at', Date.now() + expires_in]]);

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
        <View><Text>Checking cache for token...</Text></View>
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
  }
});

AppRegistry.registerComponent('SoundCloud2', () => SoundCloud2);
