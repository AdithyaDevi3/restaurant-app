import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStackNavigator } from "@react-navigation/stack";
import { MaterialIcons } from "@expo/vector-icons";
import { HomeScreen } from "./src/screens/HomeScreen";
import { MapScreen } from "./src/screens/MapScreen";
import { DetailScreen } from "./src/screens/DetailScreen";
import { PreferencesScreen } from "./src/screens/PreferencesScreen";
import { colors } from "./src/theme";

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

export default function App() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarIcon: ({ focused, color, size }) => {
            let iconName: keyof typeof MaterialIcons.glyphMap = "restaurant";

            if (route.name === "Home") {
              iconName = focused ? "restaurant" : "restaurant";
            } else if (route.name === "Map") {
              iconName = focused ? "map" : "map";
            } else if (route.name === "Preferences") {
              iconName = focused ? "tune" : "tune";
            }

            return <MaterialIcons name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: colors.disabledGray,
          tabBarStyle: {
            backgroundColor: colors.background,
            borderTopColor: colors.border,
            borderTopWidth: 1,
            paddingBottom: 8,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            marginTop: 4,
          },
        })}
      >
        <Tab.Screen
          name="Home"
          component={HomeStack}
          options={{ tabBarLabel: "Home" }}
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
