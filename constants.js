// URLS FOR ACCESSING DATA
// JSON mapping characters to (at least) frequency of character
const CHAR_RADICAL_INFO_URL =
  "https://gist.githubusercontent.com/bzh0/d7c83341739b5c5ce3258045c9c12bed/raw/3fa514c063ae4d200ca720aca88f3764b84c2e45/character_info.json";

// JSON of node and link information
const GRAPH_INFO_URL =
  "https://gist.githubusercontent.com/bzh0/2956fd315b5c46c313135fd3c04834dc/raw/73237a51220225b5a35220353db073cab0a8dd37/graph_data.json";

// min freq required in order to show text label on node
const MIN_FREQ_FOR_NODE_LABEL = 200000;

// default number of nodes shown
const DEFAULT_MAX_NODE_ID_SHOWN = 200;

// NODE PROPERTY CONSTANTS

const NODE_OPACITY_NORMAL = 0.3;
const NODE_OPACITY_HIGHLIGHT = 1.0;
const NODE_OPACITY_NEIGHBOR_HIGHLIGHT = 0.8;
const NODE_FILL_COLOR_NORMAL = "#7ebdb4";
const NODE_FILL_COLOR_SPECIAL = "#ffb367";

// LINK PROPERTY CONSTANTS
const LINK_OPACITY_NORMAL = 0.3;
const LINK_OPACITY_HIGHLIGHT = 1;
const LINK_COLOR = "#B4B4B4";

// FUNCTIONS FOR NODE PROPERTIES
// map occurrences of character to radius of node
function nodeFreqToRadius(freq) {
  return 1.5 * Math.pow(freq, 0.4);
}
