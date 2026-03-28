/**
 * @format
 */

import {enable} from 'react-native-screens';
enable();

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);
