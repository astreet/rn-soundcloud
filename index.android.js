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
  ListView
} from 'react-native';
var SC = require('SCClient');

function getDurationString(duration) {
  var min = Math.floor(duration / 1000 / 60);
  var sec = Math.floor(duration / 1000 - min * 60);
  return min + ':' + sec;
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
    JSON.parse("{}");
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

class SoundCloud2 extends Component {

  constructor(props) {
    super(props);

    this.ds = new ListView.DataSource({rowHasChanged: (r1, r2) => r1 !== r2});
    this.state = {
      songs: [],
      fetchMoreUri: null,
      dataSource: this.ds.cloneWithRows([]),
    };
  }

  componentDidMount() {
    SC.get('/me/activities', {limit: 5})
      .then((json) => {
        var songs = json.collection;
        this.setState({
          fetchMoreUri: json.next_href,
          songs: songs,
          dataSource: this.ds.cloneWithRows(songs),
        })
      }).done();
  }

  fetchMoreSongs() {
    if (!this.state.fetchMoreUri) {
      return;
    }

    SC.getRaw(this.state.fetchMoreUri)
        .then((json) => {
          var newSongs = this.state.songs.concat(json.collection);
          this.setState({
            fetchMoreUri: json.next_href,
            songs: newSongs,
            dataSource: this.ds.cloneWithRows(newSongs),
          })
        })
        .catch((error) => {
          throw error;
        });
    this.setState({fetchMoreUri: null});
  }

  render() {
    return (
      <ListView
        enableEmptySections={true}
        dataSource={this.state.dataSource}
        renderRow={(song) => <Song song={song.origin}/>}
        onEndReached={() => this.fetchMoreSongs()}
      />
    );
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
