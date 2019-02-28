'use strict';
'esversion: 6';

const port = ":13272";

var Times = {
    fourMinutes: 240000,
    tenMinutes: 600000,
    fifteenMinutes: 900000,
    twentyFiveMinutes: 1500000,
};

var States = {
    UNK: 0,
    CLR: 1,
    REQ: 2,
    ALM: 3,
    properties: {
        0: {name: "UNKNOWN", str: "unknown"},
        1: {name: "CLEAR", str: "clr"},
        2: {name: "REQUEST", str: "req"},
        3: {name: "ALARM", str: "alm"}
    }
};

var region;

var pz;

var dotState = 1;

function sleep(ms) {
    var start = new Date().getTime();
    for (var i = 0; i < 1e7; i++) {
    if ((new Date().getTime() - start) > ms){
      break;
    }
  }
}

function spyglassURL(ext) {
    return window.location.protocol + "//" + window.location.hostname + port + ext;
}

function update() {

    let a = document.getElementById("svg_map");
    let svgdoc = a.getElementsByTagName("svg")[0];

    // Get the start time so we can measure the tick time
    let start = performance.now();

    let regionURL = spyglassURL("/currentregion");
    let imapRegion = "";

    fetch(regionURL)
        .then(function (response) {
            return response.text();
        })
        .then(function (responseText) {
            imapRegion = responseText;
        });

    sleep(250);

    if (imapRegion !== region) {
        console.log("Intel Engine outdated, updating. Have " + imapRegion + " but want " + region);
        sendUpdateIntelRegion();
        sleep(500)
    }

    let reqUrl = spyglassURL("/list");

    fetch(reqUrl)
        .then(function (response) {
            return response.json();
        })
        .then(function (jsonStat) {
            for (let sys in jsonStat) {
                console.log(sys.toString() + " - " + jsonStat[sys].State + " - " + jsonStat[sys].Update);
                checkAlarm(svgdoc, jsonStat, sys);
                updateAlarmString(svgdoc, jsonStat, sys);
                updateAlarmColour(svgdoc, jsonStat, sys);

            }
        });

    updatePlayers(svgdoc);
    updateIntelMessages();


    //Update the tick time. Most browsers will not like this... #Spectre
    let tm = document.getElementById('tick');
    let tick = performance.now() - start;
    tm.innerHTML = "Tick time - " + (tick + 250).toString() + "ms";

    updateDot(pingSpyglass());


    setTimeout(update, 250)
}

function updateDot(good) {
    let dot = document.getElementById("dot");
    if (dotState === 1) {
        dotState = 0;
        if (good === true) {
            dot.style.backgroundColor = "darkseagreen";
        } else {
            dot.style.backgroundColor = "red"
        }
    } else {
        dotState = 1;
        dot.style.backgroundColor = "darkgrey";
    }
}

function pingSpyglass() {
    let spyglassReq = new XMLHttpRequest();

    spyglassReq.open("GET", spyglassURL("/test"), /* async = */ false);
    spyglassReq.send();

    return spyglassReq.status === 200


}

function updatePlayers(svgdoc) {

    // Need to reset everything first

    let gs = svgdoc.getElementsByTagName("g");
    for (let g in gs) {
        let gtop = gs[g]

    }

    let url = spyglassURL("/locations");
    fetch(url)
        .then(function (response) {
            return response.json()
        })
        .then(function (charLocs) {
            for (let chari in charLocs) {
                let char = charLocs[chari];
                let statGrp = svgdoc.getElementById(char["Location"] + "_stat");
                let statMod = statGrp.getElementsByTagName("path")[0];
                statMod.setAttribute("fill", "#ff00ff")
            }
        })

}

function updateAlarmString(svgdoc, jsonStat, sys) {
    let dt = Date.parse(jsonStat[sys].Update);
    let elapsed = elapsedTime(dt);

    let almStrGrp = svgdoc.getElementById(sys.toString() + "_alm_str");
    let almStr = almStrGrp.getElementsByTagName("text")[0];
    almStr.innerHTML = stateString(jsonStat[sys].State, elapsed);

}

function checkAlarm(svgdoc, jsonstat, sys) {
    let almStrGrp = svgdoc.getElementById(sys.toString() + "_alm_str");
    let almStr = almStrGrp.getElementsByTagName("text")[0];

    if (!(almStr.innerHTML.startsWith(jsonstat[sys].State))) {

    }
}

function updateAlarmColour(svgdoc, jsonStat, sys) {

    let almPathGrp = svgdoc.getElementById(sys.toString() + "_alm");
    let almPath = almPathGrp.getElementsByTagName("path")[0];

    let elapsed = Date.now() - Date.parse(jsonStat[sys].Update);

    let colour = "#ffffff";

    switch (jsonStat[sys].State) {
        case States.UNK:
            colour = "#ffffff";
            break;

        case States.CLR:
            colour = clearGradient(0);
            if (elapsed > Times.twentyFiveMinutes) {
                colour = "#ffffff";
            } else if (elapsed > Times.tenMinutes) {
                let fadePercent = ((elapsed - Times.tenMinutes) / (Times.twentyFiveMinutes - Times.tenMinutes));
                colour = clearGradient(fadePercent);
                break;
            }
            break;
        case States.ALM:


            if (elapsed < Times.fourMinutes) {
                colour = "#ff0000";
            } else if (elapsed < Times.tenMinutes) {
                colour = "#ffbe2e";
            } else if (elapsed < Times.fifteenMinutes) {
                colour = "#fff85a";
            } else if (elapsed < Times.twentyFiveMinutes) {
                colour = "#ffffff";
            }
            break;

    }

    almPath.setAttribute("fill", colour);
    //
    // if (Math.random() > 0.5) {
    //     almPath.setAttribute("fill", "#ff0000");
    //     // console.log(1)
    // } else {
    //     almPath.setAttribute("fill", "#00aa00");
    //     // console.log(2)
    // }
}

function clearGradient(percentDone) {

    const hue = 120 / 360;
    const sat = 1;
    const startLum = 0.5;

    let lum = startLum + ((1 - startLum) * percentDone);

    let rgb = hslToRgb(hue, sat, lum);

    // console.log('rgb(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ')');

    return 'rgb(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ')'
}

/**
 * Converts an HSL color value to RGB. Conversion formula
 * adapted from http://en.wikipedia.org/wiki/HSL_color_space.
 * Assumes h, s, and l are contained in the set [0, 1] and
 * returns r, g, and b in the set [0, 255].
 *
 * @param   h Number        The hue
 * @param   s Number        The saturation
 * @param   l Number        The lightness
 * @return  Array           The RGB representation
 */
function hslToRgb(h, s, l) {
    let r, g, b;

    if (s === 0) {
        r = g = b = l; // achromatic
    }
    else {
        // noinspection JSAnnotator
        function hue2rgb(p, q, t) {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
        }

        let q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        let p = 2 * l - q;

        r = hue2rgb(p, q, h + 1 / 3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1 / 3);
    }

    return [
        Math.max(0, Math.min(Math.round(r * 256), 255)),
        Math.max(0, Math.min(Math.round(g * 256), 255)),
        Math.max(0, Math.min(Math.round(b * 256), 255))
    ];
}

function elapsedTime(since) {

    let elapsed = (new Date().getTime() - since) / 1000;

    if (elapsed >= 0) {
        const diff = {};

        diff.days = Math.floor(elapsed / 86400);
        diff.hours = Math.floor(elapsed / 3600 % 24);
        diff.minutes = Math.floor(elapsed / 60 % 60);
        diff.seconds = Math.floor(elapsed % 60);

        let message = "";

        if (diff.days >= 1) {
            message = message.concat(diff.days + "d");
        }
        if (diff.hours >= 1) {
            message = message.concat(diff.hours + "h");
        }
        if (diff.minutes >= 1) {
            message = message.concat(diff.minutes + "m");
        }
        if (diff.seconds >= 1) {
            message = message.concat(diff.seconds + "s");
        }


        // let message = `${diff.days}d ${diff.hours}h${diff.minutes}m${diff.seconds}s`;
        // message = message.replace(/(?:0. )+/, '');
        return message
    }
    else {
        return 'unknown'
    }
}

function stateString(state, elapsedStr) {

    if (state === States.UNK) {
        return States.properties[state].str
    }

    return States.properties[state].str + ": " + elapsedStr
}

function updateIntelMessages() {

    let intel_list = document.getElementById('intel_list');
    intel_list.className = "col border intel-list";

    let requrl = spyglassURL("/latest");

    let deck = document.createElement("div");
    deck.className = "card-columns";
    deck.setAttribute('id', "intel-deck");

    fetch(requrl)
        .then(function (response) {
            return response.json();
        })
        .then(function (idb) {

            for (let rep in idb) {

                let report = idb[rep];

                let dt = new Date(report["Time"]);

                let cstate = "";

                switch (report.State) {
                    case States.ALM:
                        cstate = " text-white bg-danger";
                        break;

                    case States.CLR:
                        cstate = " text-white bg-success";
                        break;

                    case States.UNK:
                        cstate = " text-white bg-secondary";
                        break;

                    case States.REQ:
                        cstate = " text-white bg-warning";
                        break;

                }

                let card = document.createElement("div");
                card.className = "card intel_card";
                card.setAttribute('epoch', dt.getTime().toString());

                let cardhead = document.createElement("div");
                cardhead.className = "card-header" + cstate;
                cardhead.innerText = dt.toLocaleTimeString() + " - " + report["Report"];
                //cardhead.innerText = dt.toLocaleTimeString() + " - " + report["Reporter"] + " - " + report["Chatroom"];
                card.appendChild(cardhead);

                //let cardbody = document.createElement("div");
                //cardbody.className = "card-body";

                //let cardtext = document.createElement("p");
                //cardtext.className = "card-text";
                //cardtext.innerText = report["Report"];

                //cardbody.appendChild(cardtext);
                //card.appendChild(cardbody);

                deck.appendChild(card);
            }

            intel_list.innerHTML = "";
            intel_list.appendChild(deck);

            sortIntel(deck);

            if (!(intel_list.scrollTop < (intel_list.scrollHeight - intel_list.clientHeight))) {
                intel_list.scrollTop = intel_list.scrollHeight;
            }

        });
}

function sortIntel() {

    let divslist = $("div.intel_card");

    let ordered = divslist.sort(function (a, b) {
        return $(a).attr('epoch') < $(b).attr('epoch')
    });

    $("#intel-deck").html(ordered)
}

function sendUpdateIntelRegion() {
    let xhr = new XMLHttpRequest();
    xhr.open("GET", spyglassURL("/changeregion/" + region));
    xhr.send(null);
}

function updateRegionList() {

    console.log("Updating Region List");


    fetch(spyglassURL("/regions"))
        .then(function (response) {
            return response.json()
        })
        .then(function (responseJson) {
            let dropdown = document.getElementById("region_list");
            let keys = Object.keys(responseJson);

            for (let i = 0; i < keys.length; i++) {
                // dropdown.innerHTML += "<a class=\"dropdown-item\" href='reboot.html' id='" + keys[i] + "_btn'>" + keys[i] + "</a>"

                console.log("Adding key");
                let item = document.createElement('a');
                item.className = "dropdown-item";
                item.innerHTML = keys[i];
                item.id = keys[i] + "_btn";
                item.addEventListener("click", function () {
                    console.log("Region Change Requested: " + keys[i]);
                    region = keys[i];
                    sendUpdateIntelRegion();
                    setTimeout(500, document.getElementById("reload").click());
                });
                dropdown.appendChild(item);

            }

        });
}

function loadMap() {

    let map_area = document.getElementById("svg_map");
    let url = spyglassURL("/region/" + region);

    fetch(url)
        .then(function (response) {
            return response.text()

        })
        .then(function (responseString) {
            map_area.innerHTML = responseString
        })
        .then(function () {
            pz = svgPanZoom(map_area.getElementsByTagName("svg")[0], {
                zoomEnabled: true,
                controlIconsEnabled: true
            });
        })
        .then(function () {
            // Handle window resizing and move controls for svg
            window.addEventListener('resize', function() {
                pz.resize();
                pz.fit();
                pz.center();
            });
        })
        .then(function () {
            document.getElementById("btn_region").innerText = region
        })


}

function setupButtons() {

    // Load the Map
    document.getElementById("load_map").addEventListener("click", function () {

    })
}

function getRegion() {
    let url = spyglassURL("/currentregion")
    fetch(url)
        .then(function (response) {
            return response.text()
        })
        .then(function (txt) {
            region = txt
        });
}

// Set the whole process in motion once the page has finished loading
window.addEventListener('load', function() {

    updateRegionList();
    getRegion();
    setupButtons();

    setTimeout(loadMap, 300);

    // Lets kick off the whole shebang
    setTimeout(update, 4000);

});