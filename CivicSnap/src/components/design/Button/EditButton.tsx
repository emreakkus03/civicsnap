import { TouchableOpacity, Image, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Variables } from '@style/theme';
import { useThemeColors } from "@core/utils/useThemeColors";

type Props = {
  onPress: () => void;
  color?: string;
};

export default function EditButton({ onPress, color }: Props) {
    const router = useRouter();
    const colors = useThemeColors();

    return (
        <TouchableOpacity
            onPress={onPress}
            style={styles.container}
        >
            <Image 
                source={require('@assets/icons/Edit-Button.png')}
                style={{ tintColor: color ? color : colors.textLight }}
            />
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
  container: {
    padding: 5, 
    top: 10,
    bottom: 10,
    left: 10,
    right: 10,
  },
});