import React, { useEffect, useRef } from "react";
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    Animated,
    Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors } from "@core/utils/useThemeColors";
import { Variables } from "@style/theme";

interface XPPopupProps {
    visible: boolean;
    xpGained: number;
    totalXp: number;
    avatarUrl?: string;
    onClose: () => void;
}

const calculateLevelInfo = (totalXp: number) => {
    let tempLevel = 1;
    let xpForNextTier = 1000;
    let remainingXp = totalXp;

    while (remainingXp >= xpForNextTier) {
        remainingXp -= xpForNextTier;
        tempLevel++;
        xpForNextTier += 500;
    }

    const percentage = (remainingXp / xpForNextTier) * 100;
    const needed = xpForNextTier - remainingXp;

    return {
        calculatedLevel: tempLevel,
        progressPercent: percentage,
        pointsNeeded: needed,
    };
};

export default function XPPopup({ visible, xpGained, totalXp, avatarUrl, onClose }: XPPopupProps) {
    const animatedProgress = useRef(new Animated.Value(0)).current;
    const animatedScale = useRef(new Animated.Value(0.8)).current;
    const animatedOpacity = useRef(new Animated.Value(0)).current;

    const { calculatedLevel, progressPercent, pointsNeeded } = calculateLevelInfo(totalXp);
            const colors = useThemeColors();                                       
            const styles = createStyles(colors);

    useEffect(() => {
        if (visible) {
        
            animatedProgress.setValue(0);
            animatedScale.setValue(0.8);
            animatedOpacity.setValue(0);

           
            Animated.parallel([
                Animated.spring(animatedScale, {
                    toValue: 1,
                    tension: 50,
                    friction: 7,
                    useNativeDriver: true,
                }),
                Animated.timing(animatedOpacity, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ]).start();

       
            setTimeout(() => {
                Animated.timing(animatedProgress, {
                    toValue: progressPercent,
                    duration: 1000,
                    useNativeDriver: false,
                }).start();
            }, 400);
        }
    }, [visible]);

    return (
        <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
            <View style={styles.overlay}>
                <Animated.View style={[styles.card, { transform: [{ scale: animatedScale }], opacity: animatedOpacity }]}>
             
                    <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                        <Ionicons name="close" size={22} color={colors.textLight} />
                    </TouchableOpacity>

                  
                    <View style={styles.trophyWrapper}>
                        <Text style={styles.trophyEmoji}>🏆</Text>
                    </View>

                
                    <Text style={styles.title}>Melding ingediend!</Text>
                    <Text style={styles.subtitle}>Goed gedaan! Je hebt XP verdiend.</Text>

                   
                    <View style={styles.xpBadge}>
                        <Ionicons name="star" size={16} color="#FFD700" />
                        <Text style={styles.xpBadgeText}>+{xpGained} XP</Text>
                    </View>

                    
                    <View style={styles.levelRow}>
                        <Text style={styles.levelText}>Level {calculatedLevel}</Text>
                        <Text style={styles.pointsNeededText}>nog {pointsNeeded} XP nodig</Text>
                        <Text style={styles.levelText}>Level {calculatedLevel + 1}</Text>
                    </View>

                   
                    <View style={styles.progressBarBackground}>
                        <Animated.View style={[styles.progressBarFill, {
                            width: animatedProgress.interpolate({
                                inputRange: [0, 100],
                                outputRange: ["0%", "100%"],
                            })
                        }]}>
                            <View style={styles.progressAvatarWrapper}>
                                <Image
                                    source={avatarUrl ? { uri: avatarUrl } : require("@assets/icons/User.png")}
                                    style={styles.progressAvatar}
                                />
                            </View>
                        </Animated.View>
                    </View>

                    
                    <TouchableOpacity style={styles.button} onPress={onClose}>
                        <Text style={styles.buttonText}>TOP!</Text>
                    </TouchableOpacity>
                </Animated.View>
            </View>
        </Modal>
    );
}

const createStyles = (colors: any) => StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "center",
        alignItems: "center",
        padding: Variables.sizes.lg,
    },
    card: {
        backgroundColor: colors.surface,
        borderRadius: 24,
        padding: Variables.sizes.lg,
        width: "100%",
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 10,
    },
    closeButton: {
        alignSelf: "flex-end",
        marginBottom: Variables.sizes.sm,
    },
    trophyWrapper: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: "#FFF9E6",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: Variables.sizes.md,
    },
    trophyEmoji: {
        fontSize: 40,
    },
    title: {
        fontFamily: Variables.fonts.bold,
        fontSize: Variables.textSizes.lg,
        color: colors.text,
        marginBottom: Variables.sizes.xs,
    },
    subtitle: {
        fontFamily: Variables.fonts.regular,
        fontSize: Variables.textSizes.sm,
        color: colors.textLight,
        marginBottom: Variables.sizes.md,
    },
    xpBadge: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FFF9E6",
        paddingHorizontal: Variables.sizes.md,
        paddingVertical: Variables.sizes.xs,
        borderRadius: 20,
        gap: Variables.sizes.xs,
        marginBottom: Variables.sizes.lg,
    },
    xpBadgeText: {
        fontFamily: Variables.fonts.bold,
        fontSize: Variables.textSizes.md,
        color: "#F59E0B",
    },
    levelRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        width: "100%",
        marginBottom: Variables.sizes.sm,
    },
    levelText: {
        fontFamily: Variables.fonts.semibold,
        fontSize: Variables.textSizes.sm,
        color: colors.textLight,
    },
    pointsNeededText: {
        fontFamily: Variables.fonts.semibold,
        fontSize: 11,
        color: colors.primary,
        backgroundColor: "#E3F2FD",
        paddingHorizontal: Variables.sizes.sm,
        paddingVertical: 2,
        borderRadius: 10,
        overflow: "hidden",
    },
    progressBarBackground: {
        width: "100%",
        height: 18,
        backgroundColor: "#E0E0E0",
        borderRadius: 10,
        marginBottom: Variables.sizes.lg,
        overflow: "visible",
    },
    progressBarFill: {
        height: "100%",
        backgroundColor: colors.primary,
        borderRadius: 10,
        position: "relative",
    },
    progressAvatarWrapper: {
        position: "absolute",
        right: -15,
        top: -8,
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: "#FFFFFF",
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 2,
        borderColor: colors.primary,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 4,
    },
    progressAvatar: {
        width: 28,
        height: 28,
        borderRadius: 14,
    },
    button: {
        backgroundColor: colors.primary,
        borderRadius: 14,
        paddingVertical: Variables.sizes.md,
        paddingHorizontal: Variables.sizes.xl,
        width: "100%",
        alignItems: "center",
    },
    buttonText: {
        fontFamily: Variables.fonts.bold,
        fontSize: Variables.textSizes.base,
        color: colors.textInverse,
        letterSpacing: 1,
    },
});