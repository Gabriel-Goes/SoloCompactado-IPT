/* expert variables */
var animationDuration = 333;

var previousBreakPoint = '';
/* expert variables end */

/* event handler */
$(document).ready(function () {
    drawControlPanel();
    initContextHelp();

    currentBreakpoint = getCurrentBreakpoint();

    if (currentBreakpoint !== 'lg' && currentBreakpoint !== 'xl') {
        slideUp();
    }

    checkForHeightWarning();
});

$(document).on('focus', 'input, textarea', function () {
    $('body').addClass("terra-fix-fixed");
});

$(document).on('blur', 'input, textarea', function () {
    $('body').removeClass("terra-fix-fixed");
});

$(window).resize(function () {
    currentBreakpoint = getCurrentBreakpoint();
    drawControlPanel();

    //when user resizes and hits breakpoint where control element small becomes visible
    if (currentBreakpoint === 'md' && previousBreakPoint === 'lg') {
        if ($("#terra-control-panel-content-id").height() === 0) {
            $("#slideUp").show();
            $("#slideDown").hide();
        }
        else {
            $("#slideDown").show();
            $("#slideUp").hide();
        }
    }

    checkForHeightWarning();

    previousBreakPoint = currentBreakpoint;
});

$(window).on("orientationchange", function (event) {
    checkForHeightWarning();
});

function getCurrentBreakpoint() {
    breakpoints = document.getElementsByClassName('breakpoint');

    for (var i = 0; i < breakpoints.length; i++) {
        if ($(breakpoints[i]).is(':visible')) {
            return breakpoints[i].getAttribute('value');
        }
    }
}

function getCurrentOrientation() {
    if (window.innerHeight > window.innerWidth) {
        return 'portrait';
    }
    if (window.innerWidth > window.innerHeight) {
        return 'landscape';
    }
}

function checkForHeightWarning() {
    if ($('body').hasClass("terra-fix-fixed")) {
        return;
    }

    if ($(window).height() < 470) {
        $('.terra-height-warning').fadeIn();
    }
    else {
        $('.terra-height-warning').fadeOut();

        if (getCurrentBreakpoint() === 'lg' || !$("#slideUp").is(":visible"))
            slideUp();
    }
}

/* update UI */
function drawControlPanel() {
    var currentBreakPoint = getCurrentBreakpoint();

    if ((currentBreakPoint === 'lg' && previousBreakPoint !== currentBreakPoint) || (currentBreakPoint === 'xl' && previousBreakPoint !== currentBreakPoint)) {
        // move control panel to left side
        $("#terra-control-panel-content-container-id").append($("#terra-control-panel-content-id"));
        $("#terra-control-panel-container-id").css("display", "grid");
        $("#terra-control-panel-container-compact-id").css("display", "none");
        // control panel can grow in height
        $("#terra-control-panel-inner-content-container-id").css({ "maxHeight": "700px" });
    }
    else if ((currentBreakPoint === 'md' && previousBreakPoint !== currentBreakPoint) || (currentBreakPoint === 'sm' && previousBreakPoint !== currentBreakPoint) || (currentBreakPoint === 'xs' && previousBreakPoint !== currentBreakPoint)) {
        // move control panel to bottom
        $("#terra-control-panel-content-container-compact-id").append($("#terra-control-panel-content-id"));
        $("#terra-control-panel-container-compact-id").css("display", "grid");
        $("#terra-control-panel-container-id").css("display", "none");
        // control panel will scroll-y if to heigh
        $("#terra-control-panel-inner-content-container-id").css({ "maxHeight": "419px" });
    }

    previousBreakPoint = currentBreakPoint;
}

function slideUp() {
    $("#slideUp").hide();

    $("#terra-control-panel-content-id").show(animationDuration);
    $("#terra-control-panel-container-compact-id").animate({ height: $("#terra-control-handle-container-with-arrows-id").height + $("#terra-control-panel-content-id").height }, animationDuration);

    $("#slideDown").show(animationDuration);
}

function slideDown() {
    $("#slideDown").hide();

    $("#terra-control-panel-container-compact-id").animate({ height: $("#terra-control-handle-container-with-arrows-id").height }, animationDuration);
    $("#terra-control-panel-content-id").hide(animationDuration);

    $("#slideUp").show(animationDuration);
}

function toggleControlPanelOpacity() {
    var opacity = $("#terra-control-panel-container-compact-id").css("opacity");

    if (opacity === "0.5") {
        $("#terra-control-panel-container-compact-id").css("opacity", "1");
    }
    else {
        $("#terra-control-panel-container-compact-id").css("opacity", "0.5");
    }
}

function toggleTab(tabId) {
    // hide tabs
    $("#terra-control-panel-content-user-id").hide();
    $("#terra-control-panel-content-vehicle-id").hide();
    $("#terra-control-panel-content-tyre-id").hide();
    $("#terra-control-panel-content-soil-id").hide();
    $("#terra-control-panel-content-wetness-id").hide();
    $("#terra-control-panel-content-results-id").hide();

    // de-select nav icons
    $("#terra-control-panel-nav-user-id > svg").removeClass("terra-control-element-active");
    $("#terra-control-panel-nav-vehicle-id > svg").removeClass("terra-control-element-active");
    $("#terra-control-panel-nav-tyre-id > svg").removeClass("terra-control-element-active");
    $("#terra-control-panel-nav-soil-id > svg").removeClass("terra-control-element-active");
    $("#terra-control-panel-nav-wetness-id > svg").removeClass("terra-control-element-active");
    $("#terra-control-panel-nav-results-id > svg").removeClass("terra-control-element-active");

    // show current tab
    $("#terra-control-panel-content-" + tabId + "-id").show();

    // select current nav icon
    $("#terra-control-panel-nav-" + tabId + "-id > svg").addClass("terra-control-element-active");
}

function updateControlElementContent(action) {
    // clear area
    $("#terra-control-panel-inner-content-id").empty();

    // show loading spinner
    $("#terra-loading-spinner-control-panel-container-id").removeClass("terra-loading-spinner-hidden");
    $("#terra-loading-spinner-control-panel-id").removeClass("terra-loading-spinner-hidden");

    // load content
    $("#terra-control-panel-inner-content-id").load("./update-control-panel-content/" + action, function () {
        // hide loading spinner
        $("#terra-loading-spinner-control-panel-container-id").addClass("terra-loading-spinner-hidden");
        $("#terra-loading-spinner-control-panel-id").addClass("terra-loading-spinner-hidden");
    });
}

function updateContentArea(action) {
    // show loading spinner
    $("#terra-loading-spinner-content-container-id").removeClass("terra-loading-spinner-hidden");
    $("#terra-loading-spinner-content-id").removeClass("terra-loading-spinner-hidden");

    // load content
    $("#terra-content-area-content-id").load("./update-content-area-content/" + action, function () {
        // hide loading spinner
        $("#terra-loading-spinner-content-container-id").addClass("terra-loading-spinner-hidden");
        $("#terra-loading-spinner-content-id").addClass("terra-loading-spinner-hidden");
    });
}

function updateData(navigationTab, controlElementAction, contentAreaAction, identifier, value) {
    var createInfo = {
        navigationTab: navigationTab,
        controlElementAction: controlElementAction,
        contentAreaAction: contentAreaAction,
        identifier: identifier,
        value: value
    };

    $.ajax({
        type: 'POST',
        url: '/update-data',
        data: createInfo,
        dataType: 'json',
        success: function (data, textStatus, jqXHR) {
            // show toast
            if (data !== null && data !== undefined && data.toastContent !== null && data.toastContent !== undefined) {
                if (data.isReset) {
                    window.location.reload();
                    toastr.warning(data.toastContent, 'Terranimo');
                    return;
                }

                if (data.isAlert) {
                    toastr.warning(data.toastContent, 'Terranimo');
                }
                else {
                    toastr.success(data.toastContent, 'Terranimo');
                }
            }

            var updateControlElement = false;
            var updateContentArea = false;

            if (controlElementAction !== null && controlElementAction !== undefined && controlElementAction !== '') {
                updateControlElement = true;

                // clear area
                $("#terra-control-panel-inner-content-id").empty();

                // show loading spinner
                $("#terra-loading-spinner-control-panel-container-id").removeClass("terra-loading-spinner-hidden");
                $("#terra-loading-spinner-control-panel-id").removeClass("terra-loading-spinner-hidden");
            }

            if (contentAreaAction !== null && contentAreaAction !== undefined && contentAreaAction !== '') {
                updateContentArea = true;

                // show loading spinner
                $("#terra-loading-spinner-content-container-id").removeClass("terra-loading-spinner-hidden");
                $("#terra-loading-spinner-content-id").removeClass("terra-loading-spinner-hidden");
            }

            if (updateControlElement === true && updateContentArea === true) {
                $.when(
                    // load content
                    $.get("./update-control-panel-content/" + controlElementAction, function (data) {
                        $("#terra-control-panel-inner-content-id").html(data);
                    }),
                    // load content
                    $.get("./update-content-area-content/" + contentAreaAction, function (data) {
                        $("#terra-content-area-content-id").html(data);
                    })
                ).done(function () {
                    // hide loading spinner
                    $("#terra-loading-spinner-control-panel-container-id").addClass("terra-loading-spinner-hidden");
                    $("#terra-loading-spinner-control-panel-id").addClass("terra-loading-spinner-hidden");

                    // hide loading spinner
                    $("#terra-loading-spinner-content-container-id").addClass("terra-loading-spinner-hidden");
                    $("#terra-loading-spinner-content-id").addClass("terra-loading-spinner-hidden");
                });
            }

            if (updateControlElement === true && updateContentArea === false) {
                $.when(
                    // load content
                    $.get("./update-control-panel-content/" + controlElementAction, function (data) {
                        $("#terra-control-panel-inner-content-id").html(data);
                    })
                ).then(function () {
                    // hide loading spinner
                    $("#terra-loading-spinner-control-panel-container-id").addClass("terra-loading-spinner-hidden");
                    $("#terra-loading-spinner-control-panel-id").addClass("terra-loading-spinner-hidden");
                });
            }

            if (updateControlElement === false && updateContentArea === true) {
                $.when(
                    // load content
                    $.get("./update-content-area-content/" + contentAreaAction, function (data) {
                        $("#terra-content-area-content-id").html(data);
                    })
                ).then(function () {
                    // hide loading spinner
                    $("#terra-loading-spinner-content-container-id").addClass("terra-loading-spinner-hidden");
                    $("#terra-loading-spinner-content-id").addClass("terra-loading-spinner-hidden");
                });
            }
        }
    });
}

function updateLightData(identifier, value) {
    if (globalCountryCode === 'QC' && identifier === 'tyre-selected-pressure') {
        value = value / 14.5038;
    }

    var createInfo = {
        identifier: identifier,
        value: value
    };

    $.ajax({
        url: '/calculate-light',
        type: 'GET',
        data: createInfo,
        success: function (result) {
            if (result.errorText !== null && result.errorText !== undefined && result.errorText !== '') {
                window.location.reload();
                toastr.warning(result.errorText, 'Terranimo');
            }

            currentBodenbelastung = result.bodenbelastung;
            currentBodenfestigkeit = result.bodenfestigkeit;

            applyLightResults(result.bodenbelastung, result.bodenfestigkeit, result.resultat, result.infoText);
        },
        error: function (result) {
            console.log("error: " + result);
        }
    });
}

function updateLightDataForScenario(tyreLoad, tyrePressure, clayContent, soilSuction) {
    var tyrePressureFromScenario = tyrePressure;

    if (globalCountryCode === 'QC' && tyrePressure !== null && tyrePressure !== undefined) {
        tyrePressureFromScenario = tyrePressure / 14.5038;
    }

    var createInfo = {
        tyreLoad: tyreLoad,
        tyrePressure: tyrePressureFromScenario,
        clayContent: clayContent,
        soilSuction: soilSuction
    };

    $.ajax({
        url: '/calculate-light-for-scenario',
        type: 'GET',
        data: createInfo,
        success: function (result) {
            if (result.errorText !== null && result.errorText !== undefined && result.errorText !== '') {
                window.location.reload();
                toastr.warning(result.errorText, 'Terranimo');
            }

            currentBodenbelastung = result.bodenbelastung;
            currentBodenfestigkeit = result.bodenfestigkeit;

            if (tyreLoad !== undefined && tyreLoad !== null)
                $("#text_input_" + $(".slider")[0].noUiSlider.target.dataset.parameterName).val(tyreLoad);
            if (tyrePressure !== undefined && tyrePressure !== null)
                $("#text_input_" + $(".slider")[1].noUiSlider.target.dataset.parameterName).val(tyrePressure);
            if (clayContent !== undefined && clayContent !== null)
                $("#text_input_" + $(".slider")[2].noUiSlider.target.dataset.parameterName).val(clayContent);
            if (soilSuction !== undefined && soilSuction !== null)
                $("#text_input_" + $(".slider")[3].noUiSlider.target.dataset.parameterName).val(soilSuction);

            $(".slider")[0].noUiSlider.set(tyreLoad);
            $(".slider")[1].noUiSlider.set(tyrePressure);
            $(".slider")[2].noUiSlider.set(clayContent);
            $(".slider")[3].noUiSlider.set(soilSuction);

            applyLightResults(result.bodenbelastung, result.bodenfestigkeit, result.resultat, result.infoText);
        },
        error: function (result) {
            console.log("error: " + result);
        }
    });
}

function setItemSelected(uid) {
    $(".terra-pseudo-selected").hide();
    $("#" + uid).show();
}
/* update UI end */

/* sliders */
function registerInputElements(mode) {
    $('.slider').each(function (i, obj) {
        var step = parseFloat(obj.dataset.step);
        var decimals = parseInt(obj.dataset.decimals);

        noUiSlider.create(obj, {
            start: obj.dataset.value,
            step: step,
            tooltips: true,
            range: {
                min: parseFloat(obj.dataset.minValue),
                max: parseFloat(obj.dataset.maxValue)
            },
            connect: [true, false],
            format: wNumb({
                decimals: decimals
            })
        });

        var inputElement = $("#text_input_" + obj.dataset.parameterName);
        inputElement.on('change',
            function () {
                this.value = minMaxStep(this.value, obj.dataset.minValue, obj.dataset.maxValue, obj.dataset.step);
                setSliderValue(this.value, this.dataset.parameterName);
            });

        var unitElement = $("#unit_input_" + obj.dataset.parameterName);
        obj.unit = unitElement.innerHTML;

        setSliderValue(obj.dataset.value, obj.dataset.parameterName);

        obj.noUiSlider.on('slide', function () {
            var sliderVal = obj.noUiSlider.get();
            setInputValue(sliderVal, obj.dataset.parameterName);
        });

        obj.noUiSlider.on('set', function () {
            if (mode === 'expert')
                updateData(null, obj.dataset.controlElement, obj.dataset.routing, obj.dataset.expertAction, parseFloat(inputElement.val()));
            if (mode === 'light')
                updateLightData(obj.dataset.expertAction, parseFloat(inputElement.val()));
        });

    });
}

function registerDoubleInputElements() {
    $('.sliderDouble').each(function (i, obj) {
        var step = parseInt(obj.dataset.step);

        noUiSlider.create(obj, {
            start: obj.dataset.value,
            padding: [20, 20],
            step: step,
            range: {
                min: 0,
                max: 100,
            },
            connect: [true, false],
            format: wNumb({
                decimals: 0
            })
        });

        var inputElement = $("#text_input_" + obj.dataset.parameterName);
        inputElement.on('change',
            function () {
                var defaultValues = "50,50";
                var defaultValue = 50;

                if (this.value === null || this.value === undefined || this.value === "") {
                    this.value = defaultValues;
                    setSliderValue(defaultValue, this.dataset.parameterName);
                    return;
                }

                var inputParts = this.value.split(",");

                if (inputParts.length !== 2) {
                    this.value = defaultValues;
                    setSliderValue(defaultValue, this.dataset.parameterName);
                    return;
                }

                if (!isInt(inputParts[0]) || !isInt(inputParts[1])) {
                    this.value = defaultValues;
                    setSliderValue(defaultValue, this.dataset.parameterName);
                    return;
                }

                var left = parseInt(inputParts[0]);
                var right = parseInt(inputParts[1]);

                if (left < 20 || left > 80) {
                    this.value = defaultValues;
                    setSliderValue(defaultValue, this.dataset.parameterName);
                    return;
                }

                if (right < 20 || right > 80) {
                    this.value = defaultValues;
                    setSliderValue(defaultValue, this.dataset.parameterName);
                    return;
                }

                if (left + right !== 100) {
                    this.value = defaultValues;
                    setSliderValue(defaultValue, this.dataset.parameterName);
                    return;
                }

                setSliderValue(left, this.dataset.parameterName);
            });

        var unitElement = $("#unit_input_" + obj.dataset.parameterName);
        obj.unit = unitElement.innerHTML;

        setSliderValue(obj.dataset.value, obj.dataset.parameterName);

        obj.noUiSlider.on('slide', function () {
            var sliderVal = obj.noUiSlider.get();
            var left = parseInt(sliderVal);
            var right = 100 - left;
            setInputValue(left + "," + right, obj.dataset.parameterName);
        });

        obj.noUiSlider.on('set', function () {
            updateData(null, obj.dataset.controlElement, obj.dataset.routing, obj.dataset.expertAction, inputElement.val());
        });
    });
}

function registerTripleInputElements() {
    $('.sliderTriple').each(function (i, obj) {
        var step = parseInt(obj.dataset.step);

        noUiSlider.create(obj, {
            start: [30, 70],
            limit: 60,
            margin: 20,
            padding: [20, 20],
            step: 1,
            range: {
                min: 0,
                max: 100,
            },
            connect: [true, false, true],
            format: wNumb({
                decimals: 0
            })
        });

        var inputElement = $("#text_input_" + obj.dataset.parameterName);
        inputElement.on('change',
            function () {
                var defaultValues = "30,40,30";
                var defaultMin = 30;
                var defaultMax = 70;

                if (this.value === null || this.value === undefined || this.value === "") {
                    this.value = defaultValues;
                    setTripleSliderValue(defaultMin, defaultMax, this.dataset.parameterName);
                    return;
                }

                var inputParts = this.value.split(",");

                if (inputParts.length !== 3) {
                    this.value = defaultValues;
                    setTripleSliderValue(defaultMin, defaultMax, this.dataset.parameterName);
                    return;
                }

                if (!isInt(inputParts[0]) || !isInt(inputParts[1]) || !isInt(inputParts[2])) {
                    this.value = defaultValues;
                    setTripleSliderValue(defaultMin, defaultMax, this.dataset.parameterName);
                    return;
                }

                var front = parseInt(inputParts[0]);
                var middle = parseInt(inputParts[1]);
                var rear = parseInt(inputParts[2]);

                if (front < 20 || front > 60) {
                    this.value = defaultValues;
                    setTripleSliderValue(defaultMin, defaultMax, this.dataset.parameterName);
                    return;
                }

                if (middle < 20 || middle > 60) {
                    this.value = defaultValues;
                    setTripleSliderValue(defaultMin, defaultMax, this.dataset.parameterName);
                    return;
                }

                if (rear < 20 || rear > 60) {
                    this.value = defaultValues;
                    setTripleSliderValue(defaultMin, defaultMax, this.dataset.parameterName);
                    return;
                }

                if (front + middle + rear !== 100) {
                    this.value = defaultValues;
                    setTripleSliderValue(defaultMin, defaultMax, this.dataset.parameterName);
                    return;
                }

                setTripleSliderValue(front, 100 - rear, this.dataset.parameterName);
            });

        var unitElement = $("#unit_input_" + obj.dataset.parameterName);
        obj.unit = unitElement.innerHTML;

        setTripleSliderValue(obj.dataset.minValue, obj.dataset.maxValue, obj.dataset.parameterName);

        obj.noUiSlider.on('slide', function () {
            var sliderVal = obj.noUiSlider.get();
            var front = parseInt(sliderVal[0]);
            var rear = 100 - parseInt(sliderVal[1]);
            var middle = 100 - front - rear;
            setInputValue(front + "," + middle + "," + rear, obj.dataset.parameterName);
        });

        obj.noUiSlider.on('set', function () {
            updateData(null, obj.dataset.controlElement, obj.dataset.routing, obj.dataset.expertAction, inputElement.val());
        });
    });
}

function setSliderValue(value, inputValue) {
    var sliderObj = $("#slider_input_" + inputValue)[0];
    if (sliderObj !== null && sliderObj !== undefined) {
        sliderObj.noUiSlider.set(value);
    }
}

function setTripleSliderValue(value1, value2, inputValue) {
    var sliderObj = $("#slider_input_" + inputValue)[0];
    if (sliderObj !== null && sliderObj !== undefined) {
        sliderObj.noUiSlider.set([value1, value2]);
    }
}

function setInputValue(value, inputName) {
    var input = $("#text_input_" + inputName);

    if (input !== undefined && input !== null)
        input.val(value);
}

function isInt(value) {
    return !isNaN(value) &&
        parseInt(Number(value)) === value &&
        !isNaN(parseInt(value, 10));
}
/* sliders end */

/* helpers */
function minmax(value, min, max) {
    if (value === null || value === undefined || value === "" || isNaN(value)) {
        return min;
    }

    value = value.replace(/[^0-9\.]+/g, "");

    if (parseInt(value) < min || isNaN(value)) {
        return min;
    }
    else if (parseInt(value) > max) {
        return max;
    }
    else {
        return value;
    }
}

function minMaxStep(value, min, max, step) {
    if (value === null || value === undefined || value === "" || isNaN(parseFloat(value))) {
        return min;
    }

    if (parseFloat(step) < 1) {
        var result = ((Math.round(value * 100)).toFixed(0) % (Math.round(step * 100)).toFixed(0)) / 100;
        
        if (result !== 0) {
            value = parseFloat(value - result).toFixed(2);
        }
        else {
            value = parseFloat(value).toFixed(2);
        }
    }
    else {
        if (value % step !== 0) {
            value = value - (value % step);
        }
    }

    if (parseFloat(value) < min || isNaN(value)) {
        return min;
    }
    else if (parseFloat(value) > max) {
        return max;
    }
    else {
        return value;
    }
}

function takeOverManualSoilValues(element, dataElemetPrefix, dataElementId, expertAction) {
    var prefixList = ["clay_", "silt_", "sand_", "organicmatter_", "bulkdensity_", "mjaela_", "finmo_", "grovmo_"];

    var tillElementId = element.options[element.selectedIndex].value;

    element.selectedIndex = 0;

    for (var counter = dataElementId + 1; counter <= tillElementId; counter++) {

        prefixList.forEach(function (prefix) {
            var dataElement = document.getElementById(dataElemetPrefix + prefix + dataElementId);

            if (dataElement !== undefined && dataElement !== null) {
                var valueToSet = document.getElementById(dataElemetPrefix + prefix + dataElementId).value;
                document.getElementById(dataElemetPrefix + prefix + counter).value = valueToSet;
            }
        });

        updateSoilInfoText();
    }

    updateData(null,
        null,
        null,
        expertAction,
        dataElementId + '$' + 0 + '$' + tillElementId);
}

function takeOverManualValues(element, dataElemetPrefix, dataElementId, expertAction) {

    var tillElementId = element.options[element.selectedIndex].value;
    var valueToSet = document.getElementById(dataElemetPrefix + dataElementId).value;

    element.selectedIndex = 0;

    for (var i = dataElementId + 1; i <= tillElementId; i++) {
        document.getElementById(dataElemetPrefix + i).value = valueToSet;
    }

    updateData(null,
        null,
        null,
        expertAction,
        dataElementId + '$' + valueToSet + '$' + tillElementId);
}

function updateSoilInfoText() {
    var prefixList = ["clay_", "sand_", "silt_", "mjaela_", "finmo_", "grovmo_"];
    var anyError = false;

    for (var line = 1; line <= 10; line++) {
        var summOfValues = 0;

        prefixList.forEach(function (prefix) {
            var dataElement = document.getElementById("soil_texture_manual_" + prefix + line);

            if (dataElement !== undefined && dataElement !== null)
                summOfValues += parseInt(dataElement.value);
        });

        if (summOfValues !== 100) {
            $("#info_texture_manual_" + line).css('display', '');
            anyError = true;
        } else if (summOfValues === 100) {
            $("#info_texture_manual_" + line).css('display', 'none');
        }
    }

    if (anyError) {
        $("#terra_texture_manual_error_lines_id").show();
        $("#terra_texture_manual_error_area_id").removeClass("terra-text-white");
        $("#terra_texture_manual_error_area_id").addClass("terra-text-red");
    }
    else {
        $("#terra_texture_manual_error_lines_id").hide();
        $("#terra_texture_manual_error_area_id").removeClass("terra-text-red");
        $("#terra_texture_manual_error_area_id").addClass("terra-text-white");
    }
}
/* helpers end */

/* from light js */