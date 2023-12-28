let sources = [];
let frequencyArray = null;

// Find the first good frequency array.
for (let transferFunctionsKey in transferFunctions) {
    let transferFunction = transferFunctions[transferFunctionsKey];
    frequencyArray = transferFunction.frequencyArray;
    if (frequencyArray && frequencyArray.length > 0) {
        break;
    }
}

let target = createPairByType('TARGET', frequencyArray, transferFunctions);
let sum = createPairByType('SUM', frequencyArray, transferFunctions);

try {
    let i = 0;
    for (let sourceName in transferFunctions) {
        if (sourceName.toUpperCase().startsWith('ALIGNED')) {
            let source = transferFunctions[sourceName];

            if (!frequencyArray && source.frequencyArray.length > 0) {
                frequencyArray = source.frequencyArray;
            }

            sources[i++] = {
                magnitude: createPairs(frequencyArray, source.magnitudeArray),
                phase: createPairs(frequencyArray, source.phaseArray),
                coherence: createPairs(frequencyArray, source.coherenceArray)
            };
        }
    }
} catch (e) {
    console.error(e.message);
}

function createPairs(x, y) {
    return y.map((item, index) => {
        let value = isNaN(item) ? null : item;
        return [x[index], value];
    });
}

function createPairByType(type, frequencyArray, transferFunctions) {
    let result;
    try {
        if (!frequencyArray && transferFunctions[type].frequencyArray.length > 0) {
            frequencyArray = transferFunctions[type].frequencyArray;
        }
        const yValues = transferFunctions[type].magnitudeArray;
        result = createPairs(frequencyArray, yValues);
    } catch (e) {
        console.error(e.message);
    }
    return result;
}

let corridor60degStart, corridor60degEnd, xovrStart, xovrEnd, xovrCenter, targetBw;

if (!transferFunctions || !transferFunctions.OTHER || !transferFunctions.OTHER[0] || !transferFunctions.OTHER[0].transferFunctionDetailsDTO) {
    console.error('Relevant data is missing.');
} else {
    try {
        corridor60degStart = transferFunctions.OTHER[0].transferFunctionDetailsDTO.corridor60degStart;
        corridor60degEnd = transferFunctions.OTHER[0].transferFunctionDetailsDTO.corridor60degEnd;
        xovrStart = transferFunctions.OTHER[0].transferFunctionDetailsDTO.xovrStart;
        xovrEnd = transferFunctions.OTHER[0].transferFunctionDetailsDTO.xovrEnd;
        xovrCenter = transferFunctions.OTHER[0].transferFunctionDetailsDTO.xovrCenter;
        targetBw = parseFloat(transferFunctions.OTHER[0].transferFunctionDetailsDTO.bandwidth.toFixed(1));
    } catch (e) {
        console.error(e.message);
    }
}

if (typeof sources === 'undefined' || !Array.isArray(sources) || !sources.length) {
    console.error("Sources data missing or invalid. Unable to proceed.");
} else {
    const plotHeight = '30%';
    const commonStates = {
        states: {
            hover: {
                enabled: false
            },
            inactive: {
                opacity: 1
            }
        }
    };

    const colorPairs = {
        red: {light: '#ffc8c8', dark: 'red'},
        orange: {light: '#ffedcc', dark: 'orange'},
        yellow: {light: '#ffffcc', dark: 'yellow'},
        lime: {light: '#ccffcc', dark: 'lime'},
        aqua: {light: '#ccffff', dark: 'aqua'},
        indigo: {light: '#ccccff', dark: 'indigo'},
        violet: {light: '#ebccff', dark: 'violet'},
        blue: {light: '#c8c8ff', dark: 'blue'}
    };

    let magnitudeSeriesData = [];
    sources.forEach((source, i) => {
        let sourceColor;
        if (i === 0)
            sourceColor = colorPairs.red;
        else if (i === sources.length - 1)
            sourceColor = colorPairs.blue;
        else
            sourceColor = colorPairs[Math.floor(Math.random() * colorPairs.length)];

        magnitudeSeriesData.push({
            name: `${i + 1}`,
            data: source.magnitude,
            color: sourceColor.light,
            zoneAxis: 'x',
            zones: typeof xovrStart !== 'undefined' && typeof xovrEnd !== 'undefined' ? [
                {value: xovrStart, color: sourceColor.light},
                {value: xovrEnd, color: sourceColor.dark}
            ] : undefined,
        });
        magnitudeSeriesData.push({
            name: `${i + 1}`,
            data: source.coherence,
            yAxis: 1,
            color: sourceColor.dark,
            dashStyle: 'Dot',
            opacity: 0.5
        });
    });

    if (typeof sum !== 'undefined' && sum !== null) {
        magnitudeSeriesData.push({
            name: 'Sum',
            data: sum,
            color: 'magenta',
            dashStyle: 'ShortDot'
        });
    }

    if (typeof target !== 'undefined' && target !== null) {
        const label = typeof targetBw !== 'undefined' ? `Target (${targetBw}oct)` : 'Target';
        magnitudeSeriesData.push({
            name: label,
            data: target,
            color: 'black',
            dashStyle: 'ShortDash'
        });
    }

    magnitudeSeriesData = magnitudeSeriesData.map(series => Highcharts.merge(series, commonStates));

    let phaseSeriesData = sources.map((source, i) => {
        let sourceColor;
        if (i === 0)
            sourceColor = colorPairs.red;
        else if (i === sources.length - 1)
            sourceColor = colorPairs.blue;
        else
            sourceColor = colorPairs[Math.floor(Math.random() * colorPairs.length)];

        return {
            name: `${i + 1}`,
            data: source.phase,
            color: sourceColor.light,
            zoneAxis: 'x',
            zones: typeof corridor60degStart !== 'undefined' && typeof corridor60degEnd !== 'undefined' ? [
                {value: corridor60degStart, color: sourceColor.light},
                {value: corridor60degEnd, color: sourceColor.dark}
            ] : undefined,
        };
    });
    phaseSeriesData = phaseSeriesData.map(series => Highcharts.merge(series, commonStates));

    document.addEventListener('DOMContentLoaded', function () {

        function syncExtremes(e) {
            const thisChart = this.chart;
            if (e.trigger !== 'syncExtremes') { // Prevent feedback loop
                Highcharts.charts.forEach(function (chart) {
                    if (chart !== thisChart) {
                        if (chart.xAxis[0].setExtremes) { // It is null while updating
                            chart.xAxis[0].setExtremes(e.min <= 0 ? 1 : e.min, e.max, undefined, false, {trigger: 'syncExtremes'});
                        }
                    }
                });
            }
        }

        const magnitudePlot = Highcharts.chart('magnitude-plot',
            {
                chart: {
                    type: 'line',
                    zoomType: 'x',
                    height: plotHeight,
                    alignTicks: false
                },
                title: {
                    text: ''
                },
                xAxis: {
                    type: 'logarithmic',
                    lineColor: '#969696',
                    tickColor: '#969696',
                    labels: {
                        style: {
                            color: '#969696',
                        }
                    },
                    crosshair: true,
                    plotLines: typeof xovrCenter !== 'undefined' ? [{
                        color: '#969696',
                        dashStyle: 'ShortDot',
                        width: 1,
                        value: xovrCenter,
                        label: {
                            text: 'c',
                            verticalAlign: 'bottom',
                            rotation: 0,
                            textAlign: 'right',
                            y: -2
                        }
                    }] : [],
                    events: {
                        afterSetExtremes: syncExtremes
                    }
                },
                yAxis: [{
                    min: -18,
                    max: 6,
                    // tickInterval: 6,
                    title: {
                        text: 'Magnitude', reserveSpace: false, style: {
                            color: '#969696'
                        }
                    },
                    crosshair: true,
                    labels: {
                        format: '{value}dB',
                        align: 'right',
                        x: 6,
                        y: -2,
                        style: {
                            color: '#969696'
                        }
                    }
                }, { // Secondary yAxis
                    title: {
                        text: 'Coherence',
                        reserveSpace: false,
                    },
                    opposite: true,
                    min: 0,
                    max: 1,
                    top: '0%',
                    height: '50%',
                    labels: {
                        align: 'right',
                        x: -6,
                        y: -2
                    },
                    gridLineWidth: 0
                }],
                legend: {enabled: false},
                tooltip: {
                    enabled: false
                },
                series: magnitudeSeriesData
            });

        const phasePlot = Highcharts.chart('phase-plot', {
            chart: {
                type: 'line',
                zoomType: 'x',
                height: plotHeight
            },
            title: {
                text: ''
            },
            xAxis: {
                type: 'logarithmic',
                lineColor: '#969696',
                tickColor: '#969696',
                labels: {
                    style: {
                        color: '#969696',
                    }
                },
                crosshair: true,
                events: {
                    afterSetExtremes: syncExtremes
                }
            },
            yAxis: {
                min: -180,
                max: 180,
                tickInterval: 60,
                crosshair: true,
                title: {
                    text: 'Phase', reserveSpace: false, style: {
                        color: '#969696'
                    }
                },
                labels: {
                    format: '{value} °',
                    align: 'right',
                    x: 4,
                    y: -2,
                    style: {
                        color: '#969696'
                    }
                }
            },
            legend: {enabled: false},
            tooltip: {
                enabled: false
            },
            series: phaseSeriesData
        });

        ['mousemove', 'touchmove', 'touchstart'].forEach(function (eventType) {
            document.getElementById('magnitude-plot').addEventListener(eventType, function (e) {
                const chart = phasePlot,
                    event = chart.pointer.normalize(e),
                    point = chart.series[0].searchPoint(event, true);

                if (point) {
                    chart.xAxis[0].drawCrosshair(e, point);
                }
            });

            document.getElementById('phase-plot').addEventListener(eventType, function (e) {
                const chart = magnitudePlot,
                    event = chart.pointer.normalize(e),
                    point = chart.series[0].searchPoint(event, true);

                if (point) {
                    chart.xAxis[0].drawCrosshair(e, point);
                }
            });
        });
    });
}
