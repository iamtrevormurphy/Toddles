import 'react-native-gesture-handler';
import React from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  useFonts,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
} from '@expo-google-fonts/nunito';
import ErrorBoundary from './src/components/ErrorBoundary';
import { COLORS } from './src/constants/theme';

import HomeScreen from './src/screens/HomeScreen';
import Tangram from './src/games/Tangram';
import NumberMarble from './src/games/NumberMarble';

const Stack = createNativeStackNavigator();

export const navigationRef = createNavigationContainerRef();

// Dev hook so tooling can drive navigation (web preview verification)
if (__DEV__ && typeof window !== 'undefined') {
  window.__navigate = (name) => {
    if (navigationRef.isReady()) navigationRef.navigate(name);
  };
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
  });

  if (!fontsLoaded) {
    // Sand-colored blank keeps the splash transition seamless
    return <View style={{ flex: 1, backgroundColor: COLORS.backgroundLight }} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <NavigationContainer ref={navigationRef}>
          <StatusBar style="dark" />
          <Stack.Navigator
            screenOptions={{
              headerShown: false,
              animation: 'slide_from_right',
            }}
          >
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="Tangram" component={Tangram} />
            <Stack.Screen name="NumberMarble" component={NumberMarble} />
            {__DEV__ && (
              <Stack.Screen
                name="CompanionPreview"
                component={require('./src/characters/CompanionPreview').default}
              />
            )}
          </Stack.Navigator>
        </NavigationContainer>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}
