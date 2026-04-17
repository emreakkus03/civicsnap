import { Tabs } from "expo-router";
import { Image } from "react-native";

export default function AppLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarStyle: {borderTopWidth: 1} }}>
      <Tabs.Screen
        name="shop"
        options={{
          headerShown: false,
          title: "",
          tabBarShowLabel: false,
          tabBarIcon: ({ focused }) => (
            <Image
              source={
                focused
                  ? require("@assets/icons/Shop_Bold.png")
                  : require("@assets/icons/Shop.png")
              }
              style={{
                width: 24,
                height: 24,
                tintColor: focused ? "#0870C4" : "#747373",
              }}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="home"
        options={{
          headerShown: false,
          title: "",
          tabBarShowLabel: false,
          tabBarIcon: ({ focused }) => (
            <Image
              source={
                focused
                  ? require("@assets/icons/Map_Bold.png")
                  : require("@assets/icons/Map.png")
              }
              style={{
                width: 24,
                height: 24,
                tintColor: focused ? "#0870C4" : "#747373",
              }}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          headerShown: false,
          title: "",
          tabBarShowLabel: false,
          tabBarIcon: ({ focused }) => (
            <Image
              source={
                focused
                  ? require("@assets/icons/User_Bold.png")
                  : require("@assets/icons/User.png")
              }
              style={{
                width: 24,
                height: 24,
                tintColor: focused ? "#0870C4" : "#747373",
              }}
            />
          ),
        }}
      />
    </Tabs>
  );
}
