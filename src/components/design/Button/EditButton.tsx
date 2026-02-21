import { TouchableOpacity, Image, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Variables } from '@style/theme';

type Props = {
  onPress: () => void;
};

export default function EditButton({ onPress }: Props) {
    const router = useRouter();

    return (
        <TouchableOpacity
            onPress={onPress}
            style={styles.container}
        >
            <Image 
                source={require('@assets/icons/Edit-Button.png')}
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