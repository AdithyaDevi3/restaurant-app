import React, { useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStackNavigator } from "@react-navigation/stack";
import { MaterialIcons } from "@expo/vector-icons";
import { HomeScreen } from "./src/screens/HomeScreen";
import { MapScreen } from "./src/screens/MapScreen";
import { DetailScreen } from "./src/screens/DetailScreen";
import { PreferencesScreen } from "./src/screens/PreferencesScreen";
import { VisitHistoryScreen } from "./src/screens/VisitHistoryScreen";
import { LogVisitScreen } from "./src/screens/LogVisitScreen";
import { VisitMenuScreen } from "./src/screens/VisitMenuScreen";
import { ForYouScreen } from "./src/screens/ForYouScreen";
import { colors } from "./src/theme";
import { reconcileVisitPhotos } from "./src/api/visitPhotos";
import { useAppStore } from "./src/store/useAppStore";

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function HomeStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="HomeMain" component={HomeScreen} />
      <Stack.Screen name="Detail" component={DetailScreen as any} />
    </Stack.Navigator>
  );
}

function MapStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="MapMain" component={MapScreen} />
      <Stack.Screen name="Detail" component={DetailScreen as any} />
    </Stack.Navigator>
  );
}

function PreferencesStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="PreferencesMain" component={PreferencesScreen} />
    </Stack.Navigator>
  );
}

function VisitsStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="VisitHistory" component={VisitHistoryScreen} />
      <Stack.Screen name="LogVisit" component={LogVisitScreen} />
      <Stack.Screen name="VisitMenu" component={VisitMenuScreen as any} />
    </Stack.Navigator>
  );
}

function ForYouStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="ForYouMain" component={ForYouScreen} />
      <Stack.Screen name="Detail" component={DetailScreen as any} />
    </Stack.Navigator>
  );
}

export default function App() {
  useEffect(() => {
    const referencedPhotoUris = useAppStore
      .getState()
      .preferences.visitHistory.flatMap((visit) => visit.photoUris ?? []);
    reconcileVisitPhotos(referencedPhotoUris);
  }, []);

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarIcon: ({ focused, color, size }) => {
            let iconName: keyof typeof MaterialIcons.glyphMap = "restaurant";

            if (route.name === "Visits") {
              iconName = "history";
            } else if (route.name === "ForYou") {
              iconName = "auto-awesome";
            } else if (route.name === "Explore") {
              iconName = "restaurant";
            } else if (route.name === "Map") {
              iconName = "map";
            } else if (route.name === "Preferences") {
              iconName = "tune";
            }

            return <MaterialIcons name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: colors.disabledGray,
          tabBarStyle: {
            backgroundColor: colors.background,
            borderTopColor: colors.border,
            borderTopWidth: 1,
            height: 64,
            paddingTop: 6,
            paddingBottom: 6,
          },
          tabBarLabelPosition: "below-icon",
          tabBarLabelStyle: {
            fontSize: 11,
            marginTop: 2,
          },
        })}
      >
        <Tab.Screen
          name="Visits"
          component={VisitsStack}
          options={{ tabBarLabel: "Visits" }}
        />
        <Tab.Screen
          name="ForYou"
          component={ForYouStack}
          options={{ tabBarLabel: "For You" }}
        />
        <Tab.Screen
          name="Explore"
          component={HomeStack}
          options={{ tabBarLabel: "Explore" }}
        />
        <Tab.Screen
          name="Map"
          component={MapStack}
          options={{ tabBarLabel: "Map" }}
        />
        <Tab.Screen
          name="Preferences"
          component={PreferencesStack}
          options={{ tabBarLabel: "Preferences" }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
