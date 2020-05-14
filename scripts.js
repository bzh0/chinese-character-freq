// set up overlay button functions (about, instructions)
document.getElementById("aboutOverlayButton").onclick = openAbout;
document.getElementById("instructionsOverlayButton").onclick = openInstructions;
document.getElementById("closeAboutButton").onclick = closeAbout;
document.getElementById("closeInstructionsButton").onclick = closeInstructions;

// settings buttons/var
let toggleSettingsButton = document.getElementById("settingsButton");
toggleSettingsButton.onclick = toggleSettings;
let isSettingsOpen = false;

// tooltip on node hover settings
let nodeHoverWindowOn = true;
toggleHoverWindowCheckbox = document.getElementById(
  "toggleHoverWindowCheckbox"
);

toggleHoverWindowCheckbox.addEventListener("click", function() {
  nodeHoverWindowOn = !nodeHoverWindowOn;
});

// text on larger nodes
let largeNodeTextOn = true;

let toggleTextCheckbox = document.getElementById("toggleTextCheckbox");

// turn on/off labels on nodes
toggleTextCheckbox.addEventListener("click", function(d) {
  toggleLargeNodeText();
});

// set up button for resetting graph
document.getElementById("resetGraphViewButton").onclick = resetGraphView;

// attach close window function to button click
document.getElementById("closeButton").onclick = closeInfoWindow;

// max node id
let maxNodeIdShown = DEFAULT_MAX_NODE_ID_SHOWN;

// selecting number of char to show; make sure fields match actual value
let currentNumCharTextInput = document.getElementById("currentSliderNumChar");

// changing num of nodes shown
let changeNumCharSlider = document.getElementById("nodeNumSelectSlider");

// text input part
currentNumCharTextInput.value = maxNodeIdShown;
currentNumCharTextInput.addEventListener("input", function() {
  let val = Math.min(400, currentNumCharTextInput.value);
  currentNumCharTextInput.value = val;
  changeNumCharSlider.value = val;
});

// actual slider
changeNumCharSlider.value = maxNodeIdShown;
changeNumCharSlider.addEventListener("change", function() {
  document.getElementById("currentSliderNumChar").value =
    changeNumCharSlider.value;
});

// text above displaying current state
document.getElementById("currentNumChar").value = maxNodeIdShown;
// update button
document.getElementById("updateCurrentNumChar").onclick = updateNumCharShown;

// right side info window
let infoWindow = document.getElementById("info");

// for RH info window: whether same-radical words are highlighted
let sameRadicalWordsHighlighted = false;

let highlightSameRadicalWordsToggle = document.getElementById(
  "toggleSameRadicalCheckbox"
);
let toggleSameRadicalHighlightContainer = document.getElementById(
  "toggleSameRadicalHighlightContainer"
);

// set up right hand info window "show same radical words" toggle
highlightSameRadicalWordsToggle.onclick = toggleHighlightSameRadicalWords;

// set up character-related variables
var selectedCharId = null;
var selectedChar = null;

// on node hover element
let nodeHover = document.getElementById("nodeHoverContainer");

// track which nodes are linked
var linkedById = {};

// Define page margins
var margin = { top: 0, right: 0, bottom: 0, left: 0 },
  width = window.innerWidth - margin.left - margin.right,
  height = window.innerHeight - margin.top - margin.bottom;

let svg, g, simulation, link, node, circles;

// Get character information before proceeding
var charRadicalInfo;
fetch(CHAR_RADICAL_INFO_URL)
  .then(res => res.json())
  .then(out => {
    charRadicalInfo = out;
    console.log("Loaded character info JSON");
    console.log(Object.keys(out["char"]).length + " characters loaded.");
    makeGraph();
  })
  .catch(err => {
    throw err;
  });

let fullData = { nodes: [], links: [] };
let filteredData = { nodes: [], links: [] };
function makeGraph() {
  d3.json(GRAPH_INFO_URL, function(dataset) {
    fullData = dataset;

    pageSetup();
    filterData();
    updateGraph();
  });
}

function pageSetup() {
  // append svg to page
  svg = d3
    .select("#graph")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  // transparent background to svg obj so that entire image is draggable/zoomable
  svg
    .append("g")
    .attr("class", "bg")
    .append("svg:rect")
    .attr("width", width * 10)
    .attr("height", height * 10)
    .attr("fill", "transparent");

  //add encompassing group for zoom
  g = svg
    .append("g")
    .attr("class", "everything")
    .attr("id", "graphCompContainer");
}

function filterData() {
  filteredData = { nodes: [], links: [] };
  fullData.nodes.forEach(function(n) {
    if (n.id <= maxNodeIdShown) {
      let copy = {};
      Object.keys(n).forEach(function(k) {
        copy[k] = n[k];
      });
      filteredData.nodes.push(copy);
    }
  });

  // only show link if there is at least one word link originates from where all char in words are <= max id
  fullData.links.forEach(function(n) {
    if (showLink(n)) {
      let copy = {};
      Object.keys(n).forEach(function(k) {
        copy[k] = n[k];
      });
      filteredData.links.push(copy);
    }
  });

  function showLink(link) {
    let sources = link.link_origin;
    for (let i = 0; i < sources.length; i++) {
      let word = sources[i];
      let includeWord = true;
      for (let j = 0; j < word.length; j++) {
        if (charRadicalInfo["char"][word[j]]["id"] > maxNodeIdShown) {
          includeWord = false;
        }
      }
      if (includeWord) {
        return true;
      }
    }
    return false;
  }
}

function updateGraph() {
  // Force to be applied on network
  simulation = d3
    .forceSimulation(filteredData.nodes) // Force algorithm is applied to data.nodes
    .force(
      "link",
      d3
        .forceLink() // This force provides links between nodes
        .id(function(d) {
          return d.id;
        }) // This provide  the id of a node
        .links(filteredData.links) // and this the list of links
    )
    .force("charge", d3.forceManyBody().strength(-2400)) // This adds repulsion between nodes. Play with the -400 for the repulsion strength
    .force("center", d3.forceCenter(width / 2, height / 2)) // This force attracts nodes to the center of the svg area
    .force(
      "collision",
      d3
        .forceCollide()
        .radius(function(d) {
          return d.radius;
        })
        .strength(2)
    )
    .force(
      "link",
      d3
        .forceLink()
        .links(filteredData.links)
        .distance(1200)
    )
    .on("end", ticked);

  // repopulate neighbor data
  linkedById = {};
  filteredData.links.forEach(function(d) {
    linkedById[d.source.id + "," + d.target.id] = 1;
  });

  // Initialize the links
  link = g
    .append("g")
    .attr("class", "links")
    .selectAll(".links")
    .data(filteredData.links)
    .enter()
    .append("line")
    .attr("stroke-width", 60)
    .style("stroke", LINK_COLOR)
    .style("opacity", LINK_OPACITY_NORMAL);

  // Initialize the nodes
  node = g
    .append("g")
    .attr("class", "nodes")
    .selectAll(".nodes")
    .data(filteredData.nodes)
    .enter()
    .append("g")
    .call(
      d3
        .drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended)
    );

  // node circle drawing
  circles = node
    .append("circle")
    .attr("r", function(d) {
      return nodeFreqToRadius(charRadicalInfo["char"][d.name]["total_fr"]);
    })
    .attr("id", function(d) {
      return d.id;
    });

  circles
    .style("fill", NODE_FILL_COLOR_NORMAL)
    .style("opacity", NODE_OPACITY_NORMAL)
    .on("mouseenter", function(d) {
      // on hover, darken node that is hovered over, as well as neighbor nodes and links
      d3.select(this)
        .transition()
        .duration(300)
        .style("opacity", NODE_OPACITY_HIGHLIGHT);

      d3.selectAll("circle")
        .filter(function(c) {
          return areNeighbors(d.id, c.id) && c.id !== selectedCharId;
        })
        .transition()
        .duration(300)
        .style("opacity", NODE_OPACITY_HIGHLIGHT);

      link
        .filter(function(l) {
          return l.source === d || l.target === d;
        })
        .transition()
        .duration(300)
        .style("opacity", LINK_OPACITY_HIGHLIGHT);

      if (nodeHoverWindowOn) {
        // on hover, show hover window
        d3.select("#nodeHoverContainer")
          .transition()
          .duration(300)
          .style("opacity", 1);

        showNodeHover(d.name);
      }
    })
    .on("mouseout", function(d) {
      // on exit, decrease opacity again unless currently selected
      if (selectedCharId !== d.id) {
        let allNodeCircles = d3.selectAll("circle");
        // If is neighbor of selected, revert to neighbor opacity
        var connectedNodes = allNodeCircles.filter(function(c) {
          return areNeighbors(d.id, c.id);
        });

        var isSelectNeighbor = false;
        connectedNodes.each(function(c) {
          if (c.id === selectedCharId) {
            isSelectNeighbor = true;
          }
        });

        var newOpacity = NODE_OPACITY_NORMAL;
        if (isSelectNeighbor) {
          newOpacity = NODE_OPACITY_HIGHLIGHT;
        }

        d3.select(this)
          .transition()
          .duration(300)
          .style("opacity", newOpacity);

        // revert all neighbor nodes unless a neighbor is currently selected
        allNodeCircles
          .filter(function(c) {
            return (
              areNeighbors(d.id, c.id) &&
              c.id !== selectedCharId &&
              !areNeighbors(c.id, selectedCharId)
            );
          })
          .transition()
          .duration(300)
          .style("opacity", NODE_OPACITY_NORMAL);

        // if a neighbor was a neighbor of currently selected, change back to neighbor opacity
        allNodeCircles
          .filter(function(c) {
            return (
              areNeighbors(c.id, selectedCharId) ||
              (sameRadicalWordsHighlighted &&
                charRadicalInfo["char"][c.name]["radical"] ===
                  charRadicalInfo["char"][selectedChar]["radical"])
            );
          })
          .transition()
          .duration(300)
          .style("opacity", NODE_OPACITY_HIGHLIGHT);

        link
          .filter(function(l) {
            return (
              (l.source.id === d.id || l.target.id === d.id) &&
              l.source.id !== selectedCharId &&
              l.target.id !== selectedCharId
            );
          })
          .transition()
          .duration(300)
          .style("opacity", LINK_OPACITY_NORMAL);
      }

      // on exit, hide hover window
      d3.select("#nodeHoverContainer")
        .transition()
        .duration(300)
        .style("opacity", 0);
    })
    .on("click", function(d) {
      dehighlightSameRadicalWords();
      updateSelectedNode(d.id, d.name);
      updateInfoWindowContent();
      updateNodeLinkHighlighting();
    });

  // node label
  node
    .filter(function(d) {
      return (
        charRadicalInfo["char"][d.name]["total_fr"] > MIN_FREQ_FOR_NODE_LABEL
      );
    })
    .append("text")
    .attr("class", "nodeLabel")
    .attr("dy", 90)
    .attr("dx", -150)
    .text(d => d.name)
    .style("font-size", "300px")
    .style("pointer-events", "none")
    .style("display", function(n) {
      if (largeNodeTextOn) {
        return "block";
      } else {
        return "none";
      }
    });

  //Listen for tick events to render the nodes as they update in your Canvas or SVG.
  simulation.nodes(filteredData.nodes).on("tick", ticked);

  simulation.force("link").links(filteredData.links);

  // Initial zoom
  var zoom = d3.zoom().on("zoom", zoomed);

  svg.call(zoom);
  function zoomed() {
    g.attr(
      "transform",
      `translate(${d3.event.transform.x},  	 ${d3.event.transform.y}) scale(${d3.event.transform.k})`
    );
  }
  svg
    .transition()
    .delay(100)
    .duration(700)
    .call(zoom.scaleBy, 0.1);

  zoom_handler(svg);

  // if update happening after # char shown is changed, maintain the currently selected node
  updateNodeLinkHighlighting();
}

// change selected node
function updateSelectedNode(id, char) {
  // if currently selected node is same as one that was just clicked, close window / switch to no selected
  if (selectedCharId !== null && selectedCharId === id) {
    closeInfoWindow();
    return;
  }

  selectedCharId = id;
  selectedChar = char;
}

// update highlighting of all nodes and links, upon change in selected node
function updateNodeLinkHighlighting() {
  // ensure everything is correctly highlighted and colored
  d3.selectAll("circle")
    .transition()
    .duration(300)
    .style("opacity", function(c) {
      if (selectedCharId === null) {
        return NODE_OPACITY_NORMAL;
      } else if (c.id === selectedCharId) {
        return NODE_OPACITY_HIGHLIGHT;
      } else if (areNeighbors(c.id, selectedCharId)) {
        return NODE_OPACITY_HIGHLIGHT;
      } else {
        return NODE_OPACITY_NORMAL;
      }
    })
    .style("fill", function(c) {
      if (selectedCharId === null) {
        return NODE_FILL_COLOR_NORMAL;
      } else if (c.id === selectedCharId) {
        return NODE_FILL_COLOR_SPECIAL;
      } else if (areNeighbors(c.id, selectedCharId)) {
        return NODE_FILL_COLOR_NORMAL;
      } else {
        return NODE_FILL_COLOR_NORMAL;
      }
    });

  // clear links if not linked to new selected one
  link
    .filter(function(l) {
      return (
        selectedCharId === null ||
        (l.source.id !== selectedCharId && l.target.id !== selectedCharId)
      );
    })
    .transition()
    .duration(300)
    .style("opacity", LINK_OPACITY_NORMAL);

  // highlight links connected to new selected
  link
    .filter(function(l) {
      return (
        selectedCharId !== null &&
        (l.source === selectedCharId.id || l.target.id === selectedCharId)
      );
    })
    .transition()
    .duration(300)
    .style("opacity", LINK_OPACITY_HIGHLIGHT);
}

// reset graph settings
function resetGraphView(
  newMax = DEFAULT_MAX_NODE_ID_SHOWN,
  revertSettings = true
) {
  document.getElementById("graph").innerHTML = "";
  console.log("Resetting graph");

  maxNodeIdShown = newMax;
  if (typeof newMax !== "number" && typeof newMax !== "string") {
    maxNodeIdShown = DEFAULT_MAX_NODE_ID_SHOWN;
  } else {
    maxNodeIdShown = parseInt(newMax, 10);
  }

  if (revertSettings) {
    isSettingsOpen = false;
    closeSettings();

    closeAbout();
    closeInfoWindow();

    toggleHoverWindowCheckbox.checked = true;
    nodeHoverWindowOn = true;

    toggleTextCheckbox.checked = true;
    showLargeNodeText();

    highlightSameRadicalWordsToggle.checked = false;
    dehighlightSameRadicalWords();

    // set up character-related variables
    selectedCharId = null;
    selectedChar = null;
  }

  pageSetup();
  filterData();
  updateGraph();
}

// close info window and update selected node to none (along with necessary highlighting changes)
function closeInfoWindow() {
  infoWindow.style.display = "none";
  selectedCharId = null;
  selectedChar = null;
  dehighlightSameRadicalWords();
  updateNodeLinkHighlighting();
}

// populate info window on right with info on clicked character
function updateInfoWindowContent() {
  if (selectedCharId === null || selectedChar === null) {
    console.error(
      "No selected character and/or ID found. Info window not populated."
    );
    return;
  }

  infoWindow = document.getElementById("info");

  // show window
  infoWindow.style.display = "block";

  // UPDATES
  // title/character
  document.getElementById("sideChar").innerHTML = selectedChar;
  // pinyin if available
  document.getElementById("sidePinyin").innerHTML =
    charRadicalInfo["char"][selectedChar]["pinyin"] === ""
      ? "No pinyin data available"
      : charRadicalInfo["char"][selectedChar]["pinyin"];

  //definition if available
  document.getElementById("sideDef").innerHTML =
    charRadicalInfo["char"][selectedChar]["definition"] === ""
      ? "No definition available"
      : charRadicalInfo["char"][selectedChar]["definition"];

  // radical if available/exists
  let radical = charRadicalInfo["char"][selectedChar]["radical"];
  let displaySideRadicalChar = document.getElementById("sideRadicalChar");
  let displaySideRadicalMeaning = document.getElementById("sideRadicalMeaning");
  let sameRadicalWordsList = document.getElementById("sameRadicalWordsList");

  sameRadicalWordsList.innerHTML = "";
  if (radical === "") {
    // if not available, hide meaning section
    displaySideRadicalChar.innerHTML = "No radical";
    displaySideRadicalMeaning.display = "none";
    displaySideRadicalMeaning.innerHTML = "";
  } else {
    displaySideRadicalChar.innerHTML = radical;
    displaySideRadicalMeaning.display = "block";
    displaySideRadicalMeaning.innerHTML =
      charRadicalInfo["radical"][radical]["definition"] === ""
        ? "No radical meaning available"
        : charRadicalInfo["radical"][radical]["definition"];

    let sameRadicalChar = charRadicalInfo["radical"][radical]["words"];
    if (sameRadicalChar.length <= 1) {
      toggleSameRadicalHighlightContainer.style.display = "none";
      sameRadicalWordsList.innerHTML = `<span class="en">No other characters currently in the graph have the same radical. Try increasing the number of words in <b>Graph Settings</b> to possibly find one!</span>`;
    } else {
      toggleSameRadicalHighlightContainer.style.display = "block";
      for (let i = 0; i < sameRadicalChar.length; i++) {
        if (sameRadicalChar[i] !== selectedChar) {
          let otherChar = sameRadicalChar[i];
          let otherPinyin = charRadicalInfo["char"][otherChar]["pinyin"];
          let otherDef = charRadicalInfo["char"][otherChar]["definition"];

          let newSpanCh = document.createElement("span");
          newSpanCh.className = "ch";
          newSpanCh.innerHTML = otherChar;

          let newSpanEn = document.createElement("span");
          newSpanEn.className = "en";
          newSpanEn.innerHTML = `(${otherPinyin}): ${otherDef}`;

          let li = document.createElement("li");
          li.appendChild(newSpanCh);
          li.appendChild(newSpanEn);

          sameRadicalWordsList.appendChild(li);
        }
      }
    }
  }

  // words containing character
  let sideWordsList = document.getElementById("sideWordsList");
  sideWordsList.innerHTML = "";

  let connectedWords = charRadicalInfo["char"][selectedChar]["by_word"];
  if (Object.keys(connectedWords).length === 0) {
    sideWordsList.innerHTML = `<span class="en">This character is not part of any words currently included in the graph. Try increasing the number of words in <b>Graph Settings</b> to possibly find one!</span>`;
  } else {
    let liBySelf = document.createElement("li");
    let pctOccurBySelf = Math.round(
      (100 * charRadicalInfo["char"][selectedChar]["solo_fr"]) /
        charRadicalInfo["char"][selectedChar]["total_fr"]
    );

    let spanEn = document.createElement("span");
    spanEn.className = "en";
    spanEn.innerHTML = `By self: ${pctOccurBySelf}%`;

    liBySelf.appendChild(spanEn);

    sideWordsList.appendChild(liBySelf);

    // if the other char in word are not currently shown (too high of ID under filter), group under other
    let countByOther = 0;
    Object.keys(connectedWords).forEach(function(key) {
      let ignoreWord = false;
      for (let i = 0; i < key.length; i++) {
        if (charRadicalInfo["char"][key[i]]["id"] > maxNodeIdShown) {
          ignoreWord = true;
          break;
        }
      }

      if (ignoreWord) {
        countByOther += charRadicalInfo["char"][selectedChar]["by_word"][key];
      } else {
        let wordPinyin = charRadicalInfo["word"][key]["pinyin"];
        let wordDef = charRadicalInfo["word"][key]["definition"];
        let pctOccur = Math.round(
          (100 * charRadicalInfo["char"][selectedChar]["by_word"][key]) /
            charRadicalInfo["char"][selectedChar]["total_fr"]
        );

        let newSpanCh = document.createElement("span");
        newSpanCh.className = "ch charListItem";
        newSpanCh.innerHTML = key;

        let newSpanEn = document.createElement("span");
        newSpanEn.className = "en";
        newSpanEn.innerHTML = `(${wordPinyin}): ${pctOccur}%<br/>${wordDef}`;

        let li = document.createElement("li");
        li.appendChild(newSpanCh);
        li.appendChild(newSpanEn);

        sideWordsList.appendChild(li);

        newSpanCh.addEventListener("mouseenter", function() {
          d3.selectAll("circle")
            .filter(function(c) {
              return key.includes(c.name) && c.id !== selectedCharId;
            })
            .transition()
            .duration(300)
            .style("fill", NODE_FILL_COLOR_SPECIAL);
        });

        newSpanCh.addEventListener("mouseout", function() {
          d3.selectAll("circle")
            .filter(function(c) {
              return key.includes(c.name) && c.id !== selectedCharId;
            })
            .transition()
            .duration(300)
            .style("fill", NODE_FILL_COLOR_NORMAL);
        });
      }
    });

    if (countByOther > 0) {
      let liOther = document.createElement("li");
      let pctOther = Math.round(
        (100 * countByOther) / charRadicalInfo["char"][selectedChar]["total_fr"]
      );

      let spanEnOther = document.createElement("span");
      spanEnOther.className = "en";
      spanEnOther.innerHTML = `Other (char not shown): ${pctOther}%`;

      liOther.appendChild(spanEnOther);

      sideWordsList.appendChild(liOther);
    }
  }
}

// turn on/off text on larger nodes
function toggleLargeNodeText() {
  if (largeNodeTextOn) {
    hideLargeNodeText();
  } else {
    showLargeNodeText();
  }
}

function showLargeNodeText() {
  largeNodeTextOn = true;
  d3.selectAll(".nodeLabel").style("display", "block");
}

function hideLargeNodeText() {
  largeNodeTextOn = false;
  d3.selectAll(".nodeLabel").style("display", "none");
}

// turn highlighting of words with same radical as selected character on/off
function toggleHighlightSameRadicalWords() {
  if (sameRadicalWordsHighlighted) {
    dehighlightSameRadicalWords();
  } else {
    highlightSameRadicalWords();
  }
}

function highlightSameRadicalWords() {
  sameRadicalWordsHighlighted = true;
  highlightSameRadicalWordsToggle.checked = true;
  d3.selectAll("circle")
    .transition()
    .duration(300);
  d3.selectAll("circle")
    .transition()
    .duration(300)
    .style("opacity", function(c) {
      if (selectedCharId === null) {
        return NODE_OPACITY_NORMAL;
      } else if (c.id === selectedCharId) {
        return NODE_OPACITY_HIGHLIGHT;
      } else if (
        areNeighbors(c.id, selectedCharId) ||
        charRadicalInfo["char"][c.name]["radical"] ===
          charRadicalInfo["char"][selectedChar]["radical"]
      ) {
        return NODE_OPACITY_HIGHLIGHT;
      } else {
        return NODE_OPACITY_NORMAL;
      }
    })
    .style("fill", function(c) {
      if (selectedCharId === null) {
        return NODE_FILL_COLOR_NORMAL;
      } else if (
        charRadicalInfo["char"][c.name]["radical"] ===
        charRadicalInfo["char"][selectedChar]["radical"]
      ) {
        return NODE_FILL_COLOR_SPECIAL;
      } else {
        return NODE_FILL_COLOR_NORMAL;
      }
    });
}

function dehighlightSameRadicalWords() {
  sameRadicalWordsHighlighted = false;
  highlightSameRadicalWordsToggle.checked = false;
  d3.selectAll("circle")
    .transition()
    .duration(300)
    .style("opacity", function(c) {
      if (selectedCharId === null) {
        return NODE_OPACITY_NORMAL;
      } else if (c.id === selectedCharId) {
        return NODE_OPACITY_HIGHLIGHT;
      } else if (areNeighbors(c.id, selectedCharId)) {
        return NODE_OPACITY_HIGHLIGHT;
      } else {
        return NODE_OPACITY_NORMAL;
      }
    })
    .style("fill", function(c) {
      if (selectedCharId === null) {
        return NODE_FILL_COLOR_NORMAL;
      } else if (c.id === selectedCharId) {
        return NODE_FILL_COLOR_SPECIAL;
      } else {
        return NODE_FILL_COLOR_NORMAL;
      }
    });
}

// returns true if index a and b nodes are neighbors (false if they are the same)
function areNeighbors(a, b) {
  return linkedById[a + "," + b] || linkedById[b + "," + a];
}

// functions for open/close overlay windows
function openAbout() {
  document.getElementById("about").style.display = "block";
}

function closeAbout() {
  document.getElementById("about").style.display = "none";
}

function openInstructions() {
  document.getElementById("instructions").style.display = "block";
}

function closeInstructions() {
  document.getElementById("instructions").style.display = "none";
}

// function for open/close graph settings
function toggleSettings() {
  if (isSettingsOpen) {
    closeSettings();
  } else {
    openSettings();
  }
}

function openSettings() {
  document.getElementById("graphSettingsSlider").style.height = "60%";
  isSettingsOpen = true;
  toggleSettingsButton.innerHTML = "&#9650; Graph Settings";
}

function closeSettings() {
  document.getElementById("graphSettingsSlider").style.height = "0%";
  isSettingsOpen = false;
  toggleSettingsButton.innerHTML = "&#x25BC; Graph Settings";
}

// display shortened node info when you hover over it
function showNodeHover(charName) {
  // adjust hover window position to initial-enter mouse pos, text to char
  nodeHover.style.left = d3.event.pageX - 100 + "px";
  nodeHover.style.top = d3.event.pageY + 20 + "px";
  document.getElementById("chNodeHover").innerHTML = charName;

  let displayPinyin = "[no pronunciation available]";
  if (charRadicalInfo["char"][charName]["pinyin"] !== "") {
    displayPinyin =
      "(pinyin: " + charRadicalInfo["char"][charName]["pinyin"] + ")";
  }
  document.getElementById("pinyinNodeHover").innerHTML = displayPinyin;

  let displayDef = "[no definition available]";
  if (charRadicalInfo["char"][charName]["definition"] !== "") {
    displayDef = charRadicalInfo["char"][charName]["definition"];
  }
  document.getElementById("enNodeHover").innerHTML = displayDef;
}

function updateNumCharShown() {
  maxNodeIdShown = changeNumCharSlider.value;
  document.getElementById("currentSliderNumChar").value =
    changeNumCharSlider.value;
  document.getElementById("currentNumChar").innerHTML =
    changeNumCharSlider.value;
  resetGraphView(maxNodeIdShown, false);
}

// ZOOM AND PAN
// Handler for user-initiated zooms
var zoom_handler = d3
  .zoom()
  .scaleExtent([0.01, 2])
  .on("zoom", zoom_actions);

//Zoom functions
function zoom_actions() {
  g.attr("transform", d3.event.transform);
}

// Handle dragging circles
function dragstarted(d) {
  if (!d3.event.active) simulation.alphaTarget(0.3).restart();
  d.fx = d.x;
  d.fy = d.y;
}

function dragged(d) {
  d.fx = d3.event.x;
  d.fy = d3.event.y;
}

function dragended(d) {
  if (!d3.event.active) simulation.alphaTarget(0);
  d.fx = null;
  d.fy = null;
}

// This function is run at each iteration of the force algorithm, updating the nodes position (the nodes data array is directly manipulated).
function ticked() {
  link
    .attr("x1", d => d.source.x)
    .attr("y1", d => d.source.y)
    .attr("x2", d => d.target.x)
    .attr("y2", d => d.target.y);

  node.attr("transform", d => `translate(${d.x},${d.y})`);
}
