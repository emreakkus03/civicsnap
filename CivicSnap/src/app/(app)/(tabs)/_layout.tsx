import { Tabs } from "expo-router";
import { Image } from "react-native";
import { useThemeColors } from "@core/utils/useThemeColors";

export default function AppLayout() {
  const colors = useThemeColors();

  return (
    <Tabs 
      screenOptions={{ 
        headerShown: false, 
        tabBarStyle: {
          borderTopWidth: 1,
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        } 
      }}
    >
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
                tintColor: focused ? colors.primary : colors.textLight,
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
                tintColor: focused ? colors.primary : colors.textLight,
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
                tintColor: focused ? colors.primary : colors.textLight,
              }}
            />
          ),
        }}
      />
    </Tabs>
  );
}