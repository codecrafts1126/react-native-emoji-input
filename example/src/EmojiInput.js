import React from 'react';
import PropTypes from 'prop-types';
import {
    View,
    Text,
    TextInput,
    Dimensions,
    TouchableOpacity,
    TouchableWithoutFeedback,
    AsyncStorage,
} from 'react-native';
import {
    RecyclerListView,
    DataProvider,
    LayoutProvider,
} from 'recyclerlistview';

import _ from 'lodash';
import {
    responsiveFontSize,
    responsiveHeight,
    responsiveWidth,
} from 'react-native-responsive-dimensions';
import Wade from 'wade';

import Emoji from './Emoji';

import { Icon } from 'react-native-elements';

const {
    category,
    categoryIndexMap,
    emojiLib,
    emojiMap,
    emojiArray,
} = require('./emoji-data/compiled');

const categoryIcon = {
    fue: props => <Icon name="clock" type="material-community" {...props} />,
    people: props => <Icon name="face" {...props} />,
    animals_and_nature: props => <Icon name="trees" type="foundation" {...props} />,
    food_and_drink: props => <Icon name="food" type="material-community" {...props} />,
    activity: props => <Icon name="football" type="material-community" {...props} />,
    travel_and_places: props => <Icon name="plane" type="font-awesome" {...props} />,
    objects: props => <Icon name="lightbulb" type="material-community" {...props} />,
    symbols: props => <Icon name="heart" type="foundation" {...props} />,
    flags: props => <Icon name="flag" {...props} />,
};

const { width } = Dimensions.get('window');

const ViewTypes = {
    EMOJI: 0,
    CATEGORY: 1,
};

const search = Wade(emojiArray);

class EmojiInput extends React.PureComponent {
    constructor(props) {
        super(props);

        if (this.props.enableFrequentlyUsedEmoji) this.getFrequentlyUsedEmoji();

        this.emojiSize = _.floor(width / this.props.numColumns);

        this.emoji = [];

        this.loggingFunction = this.props.loggingFunction
            ? this.props.loggingFunction
            : null;

        this.verboseLoggingFunction = this.props.verboseLoggingFunction
            ? this.props.verboseLoggingFunction
            : false;

        let dataProvider = new DataProvider((e1, e2) => {
            return e1.char !== e2.char;
        });

        this._layoutProvider = new LayoutProvider(
            index =>
                _.has(this.emoji[index], 'categoryMarker')
                    ? ViewTypes.CATEGORY
                    : ViewTypes.EMOJI,
            (type, dim) => {
                switch (type) {
                    case ViewTypes.CATEGORY:
                        dim.height = this.props.categoryLabelHeight;
                        dim.width = width;
                        break;
                    case ViewTypes.EMOJI:
                        dim.height = dim.width = this.emojiSize;
                        break;
                }
            }
        );

        this._rowRenderer = this._rowRenderer.bind(this);

        this.state = {
            dataProvider: dataProvider.cloneWithRows(this.emoji),
            currentCategoryKey: this.props.enableFrequentlyUsedEmoji
                ? category[0].key
                : category[1].key,
            searchQuery: '',
            emptySearchResult: false,
            frequentlyUsedEmoji: {},
            previousLongestQuery: ''
        };
    }

    componentDidMount() {
        this.search();
    }

    componentDidUpdate(prevProps, prevStates) {
        if (this.props.resetSearch) {
            this.textInput.clear();
            this.setState({
                searchQuery: ''
            });
        }
        if (
            prevStates.searchQuery !== this.state.searchQuery ||
            prevStates.frequentlyUsedEmoji !== this.state.frequentlyUsedEmoji
        ) {
            this.search();
        }
    }

    getFrequentlyUsedEmoji = () => {
        AsyncStorage.getItem('@EmojiInput:frequentlyUsedEmoji').then(
            frequentlyUsedEmoji => {
                if (frequentlyUsedEmoji !== null) {
                    frequentlyUsedEmoji = JSON.parse(frequentlyUsedEmoji);
                    this.setState({ frequentlyUsedEmoji });
                }
            }
        );
    };

    addFrequentlyUsedEmoji = data => {
        let emoji = data.key;
        let { frequentlyUsedEmoji } = this.state;
        if (_(frequentlyUsedEmoji).has(emoji)) {
            frequentlyUsedEmoji[emoji]++;
        } else {
            frequentlyUsedEmoji[emoji] = 1;
        }
        this.setState({ frequentlyUsedEmoji });
        AsyncStorage.setItem(
            '@EmojiInput:frequentlyUsedEmoji',
            JSON.stringify(frequentlyUsedEmoji)
        );
    };

    clearFrequentlyUsedEmoji = () => {
        AsyncStorage.removeItem('@EmojiInput:frequentlyUsedEmoji');
    };

    search = () => {
        let query = this.state.searchQuery;
        this.setState({ emptySearchResult: false });

        if (query) {
            let result = _(search(query))
                .map(({ index }) => emojiLib[emojiMap[emojiArray[index]]])
                .value();
            if (!result.length) {
                this.setState({ emptySearchResult: true });
                if (this.loggingFunction) {
                    if (this.verboseLoggingFunction) {
                        this.loggingFunction(query, 'emptySearchResult');
                    } else {
                        this.loggingFunction(query);
                    }
                }
            }
            this.emojiRenderer(result);
            setTimeout(() => {
                this._recyclerListView._pendingScrollToOffset = null;
                this._recyclerListView.scrollToTop(false);
            }, 15);
        } else {
            let fue = _(this.state.frequentlyUsedEmoji)
                .toPairs()
                .sortBy([1])
                .reverse()
                .map(([key]) => key)
                .value();
            fue = _(this.props.defaultFrequentlyUsedEmoji)
                .concat(fue)
                .take(this.props.numFrequentlyUsedEmoji)
                .value();
            let _emoji = _(emojiLib)
                .pick(fue)
                .mapKeys((v, k) => `FUE_${k}`)
                .mapValues(v => ({ ...v, category: 'fue' }))
                .extend(emojiLib)
                .value();
            this.emojiRenderer(_emoji);
        }
    };

    emojiRenderer = emoji => {
        let dataProvider = new DataProvider((e1, e2) => {
            return e1.char !== e2.char;
        });

        this.emoji = [];
        let categoryIndexMap = _(category)
            .map((v, idx) => ({ ...v, idx }))
            .keyBy('key')
            .value();
        let tempEmoji = _.range(_.size(category)).map((v, k) => [
            { char: category[k].key, categoryMarker: true, ...category[k] }
        ]);
        _(emoji)
            .values()
            .each(e => {
                if (_.has(categoryIndexMap, e.category)) {
                    tempEmoji[categoryIndexMap[e.category].idx].push(e);
                }
            });
        let accurateY = 0;
        let lastCount = 0;
        let s = 0;
        _(tempEmoji).each(v => {
            let idx = categoryIndexMap[v[0].key].idx;
            let c = category[idx];

            c.idx = s;
            s = s + lastCount;

            c.y =
                _.ceil(lastCount / this.props.numColumns) * this.emojiSize +
                accurateY;
            accurateY =
                c.y + (_.size(v) === 1 ? 0 : this.props.categoryLabelHeight);

            lastCount = _.size(v) - 1;
        });
        this.emoji = _(tempEmoji)
            .filter(c => c.length > 1)
            .flatten(tempEmoji)
            .value();

        if (
            !this.props.showCategoryTitleInSearchResults &&
            this.state.searchQuery
        ) {
            this.emoji = _.filter(this.emoji, c => !c.categoryMarker);
        }

        this.setState({
            dataProvider: dataProvider.cloneWithRows(this.emoji)
        });
    };

    _rowRenderer(type, data) {
        switch (type) {
            case ViewTypes.CATEGORY:
                return (
                    <Text
                        style={[
                            styles.categoryText,
                            { ...this.props.categoryLabelTextStyle }
                        ]}
                    >
                        {data.title}
                    </Text>
                );
            case ViewTypes.EMOJI:
                return (
                    <Emoji
                        onPress={this.handleEmojiPress}
                        data={data}
                        size={this.props.emojiFontSize}
                    />
                );
        }
    }

    handleCategoryPress = key => {
        this._recyclerListView.scrollToOffset(
            0,
            category[categoryIndexMap[key].idx].y + 1,
            false
        );
    };

    handleScroll = (rawEvent, offsetX, offsetY) => {
        let idx = _(category).findLastIndex(c => c.y < offsetY);
        if (idx < 0) idx = 0;
        this.setState({ currentCategoryKey: category[idx].key });
    };

    handleEmojiPress = data => {
        this.props.onEmojiSelected(data);
        if (this.props.enableFrequentlyUsedEmoji)
            this.addFrequentlyUsedEmoji(data);
    };

    render() {
        return (
            <View
                style={{
                    flex: 1,
                    width: '100%',
                    backgroundColor: this.props.keyboardBackgroundColor
                }}
            >
                {this.props.enableSearch && (
                    <TextInput
                        ref={input => {
                            this.textInput = input;
                        }}
                        placeholderTextColor={'#A0A0A2'}
                        style={{
                            backgroundColor: 'white',
                            borderColor: '#A0A0A2',
                            borderWidth: 0.5,
                            color: 'black',
                            fontSize: responsiveFontSize(2),
                            padding: responsiveHeight(1),
                            paddingLeft: 15,
                            borderRadius: 15,
                            marginLeft: responsiveWidth(4),
                            marginRight: responsiveWidth(4),
                            marginTop: responsiveHeight(1),
                            marginBottom: responsiveHeight(0.25)
                        }}
                        returnKeyType={'search'}
                        clearButtonMode={'always'}
                        placeholder={'Search emoji'}
                        autoCorrect={false}
                        onChangeText={text => {
                            this.setState({
                                searchQuery: text
                            });
                            if (text.length) {
                                if (
                                    text.length >
                                    this.state.previousLongestQuery.length
                                ) {
                                    this.setState({
                                        previousLongestQuery: text
                                    });
                                }
                            } else {
                                if (this.loggingFunction) {
                                    if (this.verboseLoggingFunction) {
                                        this.loggingFunction(
                                            this.state.previousLongestQuery,
                                            'previousLongestQuery'
                                        );
                                    } else {
                                        this.loggingFunction(
                                            this.state.previousLongestQuery
                                        );
                                    }
                                }
                                this.setState({
                                    previousLongestQuery: ''
                                });
                            }
                        }}
                    />
                )}
                {this.state.emptySearchResult && (
                    <View style={styles.emptySearchResultContainer}>
                        <Text>No search results.</Text>
                    </View>
                )}
                <RecyclerListView
                    style={{ flex: 1 }}
                    renderAheadOffset={1500}
                    layoutProvider={this._layoutProvider}
                    dataProvider={this.state.dataProvider}
                    rowRenderer={this._rowRenderer}
                    ref={component => (this._recyclerListView = component)}
                    onScroll={this.handleScroll}
                />
                {!this.state.searchQuery &&
                    this.props.showCategoryTab && (
                        <TouchableWithoutFeedback>
                            <View style={styles.footerContainer}>
                                {_.drop(
                                    category,
                                    this.props.enableFrequentlyUsedEmoji ? 0 : 1
                                ).map(({ key }) => (
                                    <TouchableOpacity
                                        key={key}
                                        onPress={() =>
                                            this.handleCategoryPress(key)
                                        }
                                        style={styles.categoryIconContainer}
                                    >
                                        <View>
                                            {categoryIcon[key]({
                                                color:
                                                    key ===
                                                    this.state
                                                        .currentCategoryKey
                                                        ? this.props
                                                            .categoryHighlightColor
                                                        : this.props
                                                            .categoryUnhighlightedColor,
                                                size: this.props
                                                    .categoryFontSize
                                            })}
                                        </View>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </TouchableWithoutFeedback>
                    )}
            </View>
        );
    }
}

EmojiInput.defaultProps = {
    keyboardBackgroundColor: '#E3E1EC',
    numColumns: 6,

    showCategoryTab: true,
    showCategoryTitleInSearchResults: false,
    categoryUnhighlightedColor: 'lightgray',
    categoryHighlightColor: 'black',
    enableSearch: true,

    enableFrequentlyUsedEmoji: true,
    numFrequentlyUsedEmoji: 18,
    defaultFrequentlyUsedEmoji: [],

    categoryLabelHeight: 45,
    categoryLabelTextStyle: {
        fontSize: 25
    },
    emojiFontSize: 40,
    categoryFontSize: 20,
    resetSearch: false
};

EmojiInput.propTypes = {
    keyboardBackgroundColor: PropTypes.string,
    numColumns: PropTypes.number,
    emojiFontSize: PropTypes.number,

    onEmojiSelected: PropTypes.func.isRequired,

    showCategoryTab: PropTypes.bool,
    showCategoryTitleInSearchResults: PropTypes.bool,
    categoryFontSize: PropTypes.number,
    categoryUnhighlightedColor: PropTypes.string,
    categoryHighlightColor: PropTypes.string,
    categorySize: PropTypes.number,
    categoryLabelHeight: PropTypes.number,
    enableSearch: PropTypes.bool,
    categoryLabelTextStyle: PropTypes.object,

    enableFrequentlyUsedEmoji: PropTypes.bool,
    numFrequentlyUsedEmoji: PropTypes.number,
    defaultFrequentlyUsedEmoji: PropTypes.arrayOf(PropTypes.string),
    resetSearch: PropTypes.bool
};

const styles = {
    cellContainer: {
        justifyContent: 'space-around',
        alignItems: 'center',
        flex: 1
    },
    footerContainer: {
        width: '100%',
        height: responsiveHeight(8),
        backgroundColor: '#fff',
        flexDirection: 'row'
    },
    emptySearchResultContainer: {
        flex: 1,
        alignItems: 'center',
        padding: 20
    },
    emojiText: {
        color: 'black',
        fontWeight: 'bold'
    },
    categoryText: {
        color: 'black',
        fontWeight: 'bold',
        paddingTop: responsiveHeight(2),
        paddingBottom: responsiveHeight(2),
        paddingLeft: responsiveWidth(4)
    },
    categoryIconContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'space-around'
    }
};

export default EmojiInput;
