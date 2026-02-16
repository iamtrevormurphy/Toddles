import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ErrorBoundary from './src/components/ErrorBoundary';

import HomeScreen from './src/screens/HomeScreen';
import BubblePop from './src/games/BubblePop';
import ShapeSorter from './src/games/ShapeSorter';
import ColorMatch from './src/games/ColorMatch';
import NumberCatch from './src/games/NumberCatch';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <ErrorBoundary>
      <NavigationContainer>
        <StatusBar style="dark" />
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="BubblePop" component={BubblePop} />
          <Stack.Screen name="ShapeSorter" component={ShapeSorter} />
          <Stack.Screen name="ColorMatch" component={ColorMatch} />
          <Stack.Screen name="NumberCatch" component={NumberCatch} />
        </Stack.Navigator>
      </NavigationContainer>
    </ErrorBoundary>
  );
}
