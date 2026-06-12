import ThemedText from '@components/design/Typography/ThemedText';
import { useThemeColors } from "@core/utils/useThemeColors";
import { Variables } from "@style/theme";
import { Link } from 'expo-router';
import { StyleSheet, Text } from 'react-native';

type ButtonLinkProps = {
    children: React.ReactNode;
    href: any;
};

const createStyles = (colors: any) => StyleSheet.create({
    secondaryButton: {
        borderColor: colors.primary,
        borderWidth: 2,
        paddingVertical: Variables.sizes.md,
        borderRadius: Variables.sizes.md,
        marginHorizontal: Variables.sizes.lg,
        marginBottom: Variables.sizes.lg,
    },
    text: {
        color: colors.primary,
        textAlign: "center",
    }
});

const ButtonLink = ( { children, href }: ButtonLinkProps ) => {
    const colors = useThemeColors();
    const styles = createStyles(colors);

    return (
        <Link style={styles.secondaryButton} href={href}>
            <ThemedText color='blue' type='center'>{children}</ThemedText>
        </Link>
    );
};

export default ButtonLink;