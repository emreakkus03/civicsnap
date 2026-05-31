import React, { useState, useRef, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Path, Text as SvgText, G } from "react-native-svg";
import * as Notifications from 'expo-notifications';

import { useAuthContext } from "@components/functional/Auth/authProvider";
import { API } from "@core/networking/api";
import { Variables } from "@/style/theme";
import { useRealtime } from "@core/modules/realtimeProvider/RealtimeProvider";

const PRIZES = [
  { label: "Helaas", color: "#E0E0E0", text: "#333", value: 0 },
  { label: "5 💎", color: "#31ACE4", text: "#FFF", value: 5 },
  { label: "Helaas", color: "#E0E0E0", text: "#333", value: 0 },
  { label: "15 💎", color: "#3A7ECF", text: "#FFF", value: 15 },
  { label: "Helaas", color: "#E0E0E0", text: "#333", value: 0 },
  { label: "50 💎", color: "#8551A2", text: "#FFF", value: 50 },
  { label: "5 💎", color: "#31ACE4", text: "#FFF", value: 5 },
  { label: "100 💎", color: "#A24291", text: "#FFF", value: 100 },
];


const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
};

const createPieSlice = (cx: number, cy: number, radius: number, startAngle: number, endAngle: number) => {
  const start = polarToCartesian(cx, cy, radius, endAngle);
  const end = polarToCartesian(cx, cy, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return [
    "M", start.x, start.y,
    "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y,
    "L", cx, cy,
    "Z",
  ].join(" ");
};

export default function DailySpinScreen() {
  const router = useRouter();
  const { profile } = useAuthContext();
  const { triggerUpdate } = useRealtime();

  const [spinning, setSpinning] = useState(false);
  const [hasSpun, setHasSpun] = useState(false);
  const spinValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (profile?.last_daily_spin) {
      const lastSpin = new Date(profile.last_daily_spin);
      const today = new Date();

      const isToday = 
        lastSpin.getDate() === today.getDate() &&
        lastSpin.getMonth() === today.getMonth() &&
        lastSpin.getFullYear() === today.getFullYear();

      if (isToday) {
        setHasSpun(true); 
      }
    }
  }, [profile?.last_daily_spin]);

 const handleSpin = async () => {
    if (spinning || hasSpun) return;
    setSpinning(true);

    try {
      const response = await API.functions.createExecution(
        API.config.dailySpinFunctionId,
        JSON.stringify({ user_id: profile?.$id })
      );

      const result = JSON.parse(response.responseBody);

      if (result.success) {
        const segmentAngle = 360 / PRIZES.length; 

const targetAngle = 1080 + (360 - (result.wheelIndex * segmentAngle)); 

Animated.timing(spinValue, {
  toValue: targetAngle,
  duration: 1500, 
  easing: Easing.out(Easing.cubic), 
  useNativeDriver: true,
}).start(async () => {
          setSpinning(false);
          setHasSpun(true);
          
          const wonPrize = PRIZES[result.wheelIndex];

          
          if (wonPrize.value > 0) {
            Alert.alert("Gefeliciteerd! 🎉", `Je hebt ${wonPrize.value} diamanten gewonnen!`);
            if (triggerUpdate) triggerUpdate(); 
          } else {
            Alert.alert("Helaas", "Niets gewonnen! Probeer het morgen opnieuw. 😢");
          }

          
          await Notifications.cancelAllScheduledNotificationsAsync(); 
          await Notifications.scheduleNotificationAsync({
            content: {
              title: "🎰 Tijd om te draaien!",
              body: "Je nieuwe diamanten liggen klaar. Kom ze claimen!",
              data: { screen: "/daily-spin" }, 
            },
            trigger: { 
              type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
              seconds: 24 * 60 * 60 
            }, 
          });
        });
      } else {
        Alert.alert("Oeps!", result.error || "Kon het rad niet draaien.");
        setSpinning(false);
        setHasSpun(true); 
      }
    } catch (error) {
      Alert.alert("Fout", "Kan geen verbinding maken met de server.");
      setSpinning(false);
    }
  };

  const spinTransform = spinValue.interpolate({
    inputRange: [0, 3600],
    outputRange: ["0deg", "3600deg"],
  });

  
  const renderSvgWheel = () => {
    const size = 300;
    const radius = size / 2;
    const cx = radius;
    const cy = radius;
    const anglePerSlice = 360 / PRIZES.length;

    return (
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <G>
          {PRIZES.map((prize, i) => {
            
            const startAngle = i * anglePerSlice - anglePerSlice / 2;
            const endAngle = startAngle + anglePerSlice;
            const pathData = createPieSlice(cx, cy, radius, startAngle, endAngle);
            
            
            const textAngle = i * anglePerSlice;
            const textRadius = radius * 0.70; 
            const { x, y } = polarToCartesian(cx, cy, textRadius, textAngle);

            return (
              <G key={i}>
                
                <Path d={pathData} fill={prize.color} stroke="#FFFFFF" strokeWidth="3" />
                
                <SvgText
                  x={x}
                  y={y}
                  fill={prize.text}
                  fontSize="18"
                  fontFamily={Variables.fonts.bold}
                  fontWeight="bold"
                  textAnchor="middle"
                  alignmentBaseline="middle"
                  transform={`rotate(${textAngle}, ${x}, ${y})`}
                >
                  {prize.label}
                </SvgText>
              </G>
            );
          })}
        </G>
      </Svg>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 5 }}>
          <Ionicons name="arrow-back" size={24} color={Variables.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Rad van Fortuin</Text>
        <View style={{ width: 34 }} />
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>Test je geluk!</Text>
        <Text style={styles.subtitle}>
          Draai elke dag aan het rad om extra diamanten te winnen voor mooie beloningen.
        </Text>

        <View style={styles.wheelWrapper}>
        
          <Ionicons name="caret-down" size={45} color={Variables.colors.primary} style={styles.pointer} />
          
          <Animated.View style={[styles.wheelContainer, { transform: [{ rotate: spinTransform }] }]}>
      
             {renderSvgWheel()}
          </Animated.View>
        </View>

        <TouchableOpacity
          style={[styles.spinButton, (spinning || hasSpun) && styles.spinButtonDisabled]}
          onPress={handleSpin}
          disabled={spinning || hasSpun}
        >
          <Text style={styles.spinButtonText}>
            {spinning ? "Aan het draaien..." : hasSpun ? "Morgen weer een kans!" : "DRAAI AAN HET RAD"}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Variables.colors.background || "#F8F9FA" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 15, paddingVertical: 10, backgroundColor: "white" },
  headerTitle: { fontFamily: Variables.fonts.bold, fontSize: 18, color: Variables.colors.text },
  content: { flex: 1, alignItems: "center", paddingTop: 40, paddingHorizontal: 20 },
  title: { fontFamily: Variables.fonts.bold, fontSize: 28, color: Variables.colors.text, marginBottom: 10 },
  subtitle: { fontFamily: Variables.fonts.regular, fontSize: 15, color: Variables.colors.textLight, textAlign: "center", marginBottom: 50 },
  wheelWrapper: { position: "relative", alignItems: "center", justifyContent: "center", width: 300, height: 300, marginBottom: 50 },
  pointer: { position: "absolute", top: -25, zIndex: 10 },
  wheelContainer: { width: 300, height: 300, borderRadius: 150, shadowColor: "#000", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 10 },
  spinButton: { backgroundColor: Variables.colors.primary, paddingHorizontal: 30, paddingVertical: 18, borderRadius: 30, width: "100%", alignItems: "center", shadowColor: Variables.colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 },
  spinButtonDisabled: { backgroundColor: Variables.colors.textLight, shadowOpacity: 0, elevation: 0 },
  spinButtonText: { fontFamily: Variables.fonts.bold, fontSize: 16, color: "white" },
});