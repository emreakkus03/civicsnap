import { TouchableOpacity, Image, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useThemeColors } from "@core/utils/useThemeColors";

type Props = {
  color?: string;
};

export default function BackButton({ color }: Props) {
    const router = useRouter();
    const colors = useThemeColors();
    const styles = createStyles(colors);

    return (
        <TouchableOpacity
            onPress={() => router.back()}
            style={styles.container}
        >
            <Image 
                source={require('@assets/icons/Arrow-left-circle.png')}
                style={[styles.icon, color ? { tintColor: color } : {}]}
            />
        </TouchableOpacity>
    );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    marginBottom: 20, 
    alignSelf: 'flex-start', 
    padding: 5, 
  },
  icon: {
    width: 24,  
    height: 24,
    tintColor: colors.text,
  },
});