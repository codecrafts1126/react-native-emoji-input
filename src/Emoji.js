import { PureComponent } from 'react';
import PropTypes from 'prop-types';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Image,
} from 'react-native';

const EMOJI_DATASOURCE_VERSION = '4.0.4';

class Emoji extends PureComponent {
    static propTypes = {
        data: PropTypes.shape({
            char: PropTypes.char,
        }),
        onPress: PropTypes.func.isRequired,
        native: PropTypes.bool,
        style: PropTypes.object,
        labelStyle: PropTypes.object,
        set: PropTypes.string,
    }

    static defaultProps = {
        native: true,
        set: 'apple',
    }

    constructor(props) {
        super(props);
    }

    _getImage = data => { // eslint-disable-line
        const { set } = this.props;

        let image = '';

        let imageSource = {
            uri: `https://unpkg.com/emoji-datasource-${set}@${EMOJI_DATASOURCE_VERSION}/img/${set}/64/${image}`,
        };

        return imageSource;
    }

    render() {
        let imageComponent = null;

        const { native, style, labelStyle, data, onPress } = this.props;

        if (!native) {
            const emojiImageFile = this._getImage(data);

            const imageStyle = {
                width: this.props.size,
                height: this.props.size,
            };

            imageComponent = (
                <Image
                    style={imageStyle}
                    source={emojiImageFile}
                />
            );
        }

        const emojiComponent = (
            <View style={StyleSheet.flatten([ styles.emojiWrapper, style ])}>
                { native ? (
                    <Text
                        style={StyleSheet.flatten([
                            styles.labelStyle,
                            labelStyle,
                        ])}
                    >
                        {data.char}
                    </Text>
                ) : (
                    imageComponent
                ) }
            </View>
        );

        return onPress ? (
            <TouchableOpacity
                style={styles.emojiWrapper}
                onPress={() => {
                    onPress(data);
                }}
            >
                {emojiComponent}
            </TouchableOpacity>
        ) : (
            emojiComponent
        );
    }
}

const styles = StyleSheet.create({
    emojiWrapper: {
        justifyContent: 'space-around',
        alignItems: 'center',
        flex: 1
    },
    labelStyle: {
        color: 'black',
        fontWeight: 'bold'
    },
});

export default Emoji;