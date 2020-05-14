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
document
  .getElementById("toggleHoverWindowCheckbox")
  .addEventListener("click", function() {
    nodeHoverWindowOn = !nodeHoverWindowOn;
  });

// text on larger nodes
let largeNodeTextOn = true;

// right side info window
let infoWindow = document.getElementById("info");

// for RH info window: whether same-radical words are highlighted
let sameRadicalWordsHighlighted = false;

// set up character-related variables
var selectedCharId = null;
var selectedChar = null;

// on node hover element
let nodeHover = document.getElementById("nodeHoverContainer");

// track which nodes are linked
var linkedByIndex = {};

// Define page margins
var margin = { top: 0, right: 0, bottom: 0, left: 0 },
  width = window.innerWidth - margin.left - margin.right,
  height = window.innerHeight - margin.top - margin.bottom;

// Get character information before proceeding
var charRadicalInfo;
fetch(CHAR_RADICAL_INFO_URL)
  .then(res => res.json())
  .then(out => {
    charRadicalInfo = out;
    console.log("Loaded character info JSON");
    console.log(Object.keys(out["char"]).length + " characters loaded.");
    updateGraph();
  })
  .catch(err => {
    throw err;
  });

// Making graph
function updateGraph() {
  // set up right hand info window "show same radical words" toggle
  let highlightSameRadicalWordsToggle = document.getElementById(
    "toggleSameRadicalCheckbox"
  );
  let toggleSameRadicalHighlightContainer = document.getElementById(
    "toggleSameRadicalHighlightContainer"
  );
  highlightSameRadicalWordsToggle.onclick = toggleHighlightSameRadicalWords;

  // append svg to page
  var svg = d3
    .select("#graph")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  // transparent background to svg obj so that entire image is draggable/zoomable
  var bg = svg
    .append("g")
    .attr("class", "bg")
    .append("svg:rect")
    .attr("width", width * 10)
    .attr("height", height * 10)
    .attr("fill", "transparent");

  //add encompassing group for zoom
  var g = svg.append("g").attr("class", "everything");

  // load date
  d3.json(GRAPH_INFO_URL, function(dataset) {
    // Force to be applied on network

    var simulation = d3
      .forceSimulation(dataset.nodes) // Force algorithm is applied to data.nodes
      .force(
        "link",
        d3
          .forceLink() // This force provides links between nodes
          .id(function(d) {
            return d.id;
          }) // This provide  the id of a node
          .links(dataset.links) // and this the list of links
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
          .links(dataset.links)
          .distance(1200)
      )
      .on("end", ticked);

    dataset.links.forEach(function(d) {
      linkedByIndex[d.source.index + "," + d.target.index] = 1;
    });

    // Initialize the links
    const link = g
      .append("g")
      .attr("class", "links")
      .selectAll(".links")
      .data(dataset.links)
      .enter()
      .append("line")
      .attr("stroke-width", 60)
      .style("stroke", LINK_COLOR)
      .style("opacity", LINK_OPACITY_NORMAL);

    // Initialize the nodes
    const node = g
      .append("g")
      .attr("class", "nodes")
      .selectAll(".nodes")
      .data(dataset.nodes)
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
    const circles = node
      .append("circle")
      .attr("r", function(d) {
        return nodeFreqToRadius(charRadicalInfo["char"][d.name]["total_fr"]);
      })
      .attr("index", function(d) {
        return d.index;
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
            return areNeighbors(d.index, c.index) && c.index !== selectedCharId;
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
        if (selectedCharId !== d.index) {
          let allNodeCircles = d3.selectAll("circle");
          // If is neighbor of selected, revert to neighbor opacity
          var connectedNodes = allNodeCircles.filter(function(c) {
            return areNeighbors(d.index, c.index);
          });

          var isSelectNeighbor = false;
          connectedNodes.each(function(c) {
            if (c.index === selectedCharId) {
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
                areNeighbors(d.index, c.index) &&
                c.index !== selectedCharId &&
                !areNeighbors(c.index, selectedCharId)
              );
            })
            .transition()
            .duration(300)
            .style("opacity", NODE_OPACITY_NORMAL);

          // if a neighbor was a neighbor of currently selected, change back to neighbor opacity
          allNodeCircles
            .filter(function(c) {
              return (
                areNeighbors(c.index, selectedCharId) ||
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
                (l.source.index === d.index || l.target.index === d.index) &&
                l.source.index !== selectedCharId &&
                l.target.index !== selectedCharId
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
        updateSelectedNode(d.index, d.name);
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
      .style("pointer-events", "none");

    //Listen for tick events to render the nodes as they update in your Canvas or SVG.
    simulation.nodes(dataset.nodes).on("tick", ticked);

    simulation.force("link").links(dataset.links);

    // ZOOM AND PAN
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
      .call(zoom.scaleBy, 0.2);

    // Handler for user-initiated zooms
    var zoom_handler = d3
      .zoom()
      .scaleExtent([0.01, 2])
      .on("zoom", zoom_actions);

    zoom_handler(svg);

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

    // reset graph settings
    function resetGraphView() {
      document.getElementById("graph").innerHTML = "";
      console.log("Resetting graph");
      updateGraph();

      isSettingsOpen = false;

      // set up character-related variables
      selectedCharId = null;
      selectedChar = null;

      closeSettings();
      closeAbout();
      closeInfoWindow();
    }

    // close info window and update selected node to none (along with necessary highlighting changes)
    function closeInfoWindow() {
      infoWindow.style.display = "none";
      selectedCharId = null;
      selectedChar = null;
      dehighlightSameRadicalWords();
      updateNodeLinkHighlighting();
    }

    // set up button for resetting graph
    document.getElementById("resetGraphViewButton").onclick = resetGraphView;

    // attach close window function to button click
    document.getElementById("closeButton").onclick = closeInfoWindow;

    // update highlighting of all nodes and links, upon change in selected node
    function updateNodeLinkHighlighting() {
      // ensure everything is correctly highlighted and colored
      d3.selectAll("circle")
        .transition()
        .duration(300)
        .style("opacity", function(c) {
          if (selectedCharId === null) {
            return NODE_OPACITY_NORMAL;
          } else if (c.index === selectedCharId) {
            return NODE_OPACITY_HIGHLIGHT;
          } else if (areNeighbors(c.index, selectedCharId)) {
            return NODE_OPACITY_HIGHLIGHT;
          } else {
            return NODE_OPACITY_NORMAL;
          }
        })
        .style("fill", function(c) {
          if (selectedCharId === null) {
            return NODE_FILL_COLOR_NORMAL;
          } else if (c.index === selectedCharId) {
            return NODE_FILL_COLOR_SPECIAL;
          } else if (areNeighbors(c.index, selectedCharId)) {
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
            (l.source.index !== selectedCharId &&
              l.target.index !== selectedCharId)
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
            (l.source === selectedCharId.index ||
              l.target.index === selectedCharId)
          );
        })
        .transition()
        .duration(300)
        .style("opacity", LINK_OPACITY_HIGHLIGHT);
    }
  });

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
    let displaySideRadicalMeaning = document.getElementById(
      "sideRadicalMeaning"
    );
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
      let count = 0;
      Object.keys(connectedWords).forEach(function(key) {
        let wordPinyin = charRadicalInfo["word"][key]["pinyin"];
        let wordDef = charRadicalInfo["word"][key]["definition"];

        let newSpanCh = document.createElement("span");
        newSpanCh.className = "ch charListItem";
        newSpanCh.innerHTML = key;

        let newSpanEn = document.createElement("span");
        newSpanEn.className = "en";
        newSpanEn.innerHTML = `(${wordPinyin}): ${wordDef}`;

        let li = document.createElement("li");
        li.appendChild(newSpanCh);
        li.appendChild(newSpanEn);

        sideWordsList.appendChild(li);

        newSpanCh.addEventListener("mouseenter", function() {
          d3.selectAll("circle")
            .filter(function(c) {
              return key.includes(c.name) && c.index !== selectedCharId;
            })
            .transition()
            .duration(300)
            .style("fill", NODE_FILL_COLOR_SPECIAL);
        });

        newSpanCh.addEventListener("mouseout", function() {
          d3.selectAll("circle")
            .filter(function(c) {
              return key.includes(c.name) && c.index !== selectedCharId;
            })
            .transition()
            .duration(300)
            .style("fill", NODE_FILL_COLOR_NORMAL);
        });

        count += 1;
      });
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

  // turn on/off labels on nodes
  document
    .getElementById("toggleTextCheckbox")
    .addEventListener("click", function(d) {
      toggleLargeNodeText();
    });

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
        } else if (c.index === selectedCharId) {
          return NODE_OPACITY_HIGHLIGHT;
        } else if (
          areNeighbors(c.index, selectedCharId) ||
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
        } else if (c.index === selectedCharId) {
          return NODE_OPACITY_HIGHLIGHT;
        } else if (areNeighbors(c.index, selectedCharId)) {
          return NODE_OPACITY_HIGHLIGHT;
        } else {
          return NODE_OPACITY_NORMAL;
        }
      })
      .style("fill", function(c) {
        if (selectedCharId === null) {
          return NODE_FILL_COLOR_NORMAL;
        } else if (c.index === selectedCharId) {
          return NODE_FILL_COLOR_SPECIAL;
        } else {
          return NODE_FILL_COLOR_NORMAL;
        }
      });
  }
}

// returns true if index a and b nodes are neighbors (false if they are the same)
function areNeighbors(a, b) {
  return linkedByIndex[a + "," + b] || linkedByIndex[b + "," + a];
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
  document.getElementById("graphSettingsSlider").style.height = "50%";
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
