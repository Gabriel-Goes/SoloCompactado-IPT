/* light variables */
var currentBodenbelastung;
var currentBodenfestigkeit;
/* light variables end */

$(window).resize(function () {
    applyLightResults(currentBodenbelastung, currentBodenfestigkeit, null);
});

/* diagram activation / tabs handling */
function getActiveDiagram() {
    var diagramContents = document.getElementsByClassName("terra-pseudo-diagram-content");

    for (var e = 0; e < diagramContents.length; e++) {
        if ($(diagramContents[e]).is(':visible')) {
            return diagramContents[e];
        }
    }
}

function activateDiagram(button) {
    var content = document.getElementById(button.id + "_Content");
    var contents = document.getElementsByClassName("terra-pseudo-diagram-content");

    for (var i = 0; i < contents.length; i++) {
        if (contents[i] !== content && contents[i].classList.contains("d-block")) {
            contents[i].classList.remove("d-block");
            contents[i].classList.add("d-none");
        }
        else {
            content.classList.remove("d-none");
            content.classList.add("d-block");
        }
    }
    var buttons = document.getElementsByClassName('terra-diagram-btn');

    for (var e = 0; e < buttons.length; e++) {
        var underline = buttons[e].querySelector('.underline');
        var arrow = buttons[e].querySelector('.terra-arrow-up');
        var arrowDiv = buttons[e].querySelector('.greenArrow');

        if (buttons[e].classList.contains('active') && buttons[e].id !== button.id) {
            buttons[e].classList.remove('active');
            arrowDiv.style.opacity = 0;

            arrow.classList.remove('green');
            arrow.classList.add('gray');
            underline.classList.remove('terra-underline-green');
            underline.classList.add('terra-underline-gray');
        }
        else if (buttons[e] === button) {
            button.classList.add('active');
            arrowDiv.style.opacity = 1;
            arrow.classList.add('active');
            arrow.classList.remove('gray');
            arrow.classList.add('green');
            underline.classList.remove('terra-underline-gray');
            underline.classList.add('terra-underline-green');
        }

        var icon = buttons[e].querySelector('.terra-diagram-icon');
        var underlineIcon = buttons[e].querySelector('.underlineIcon');

        if (icon.classList.contains('active') && buttons[e].id !== button.id) {
            icon.classList.remove('active');
            underlineIcon.classList.remove('terra-underline-green');
            underlineIcon.classList.add('terra-underline-gray');
        }
        else if (buttons[e] === button) {
            icon.classList.add('active');
            underlineIcon.classList.add('terra-underline-green');
            underlineIcon.classList.remove('terra-underline-gray');
        }
    }

    applyLightResults(currentBodenbelastung, currentBodenfestigkeit, null);
}

/* update UI */
function applyLightResults(bodenbelastung, bodenfestigkeit, resultat, infotext) {
    if (bodenbelastung !== null && bodenbelastung !== undefined && bodenfestigkeit !== null && bodenfestigkeit !== undefined && resultat !== null && resultat !== undefined) {
        if (globalCountryCode === 'QC') {
            document.getElementById("bodenbelastung").innerHTML = " " + Math.round(((bodenbelastung / 100 * 14.5038) + Number.EPSILON) * 10) / 10 + " psi";
            document.getElementById("bodenfestigkeit").innerHTML = " " + Math.round(((bodenfestigkeit / 100 * 14.5038) + Number.EPSILON) * 10) / 10 + " psi";
        }
        else {
            document.getElementById("bodenbelastung").innerHTML = " " + bodenbelastung / 100 + " bar";
            document.getElementById("bodenfestigkeit").innerHTML = " " + bodenfestigkeit / 100 + " bar";
        }
        //document.getElementById("terra_light_infotext").innerHTML = infotext;

        var diagram = getActiveDiagram();
        var resultColorField = document.getElementsByClassName("resultColor")[0];
        var speechBubbles = document.getElementsByClassName("terra-speech-bubble");

        for (var i = 0; i < speechBubbles.length; i++) {
            if (speechBubbles[i].classList.contains('d-inline')) {
                speechBubbles[i].classList.remove('d-inline');
                speechBubbles[i].classList.add('d-none');
            }
        }

        var bottomDistance = 15;

        if (resultat === 0) {
            document.getElementById("terra-light-result-icon").src = "/images/accessories/good.png";

            resultColorField.style.background = "#C4DC84";
            speechBubbles[0].classList.remove('d-none');
            speechBubbles[0].classList.add('d-inline');
            speechBubbles[0].style.bottom = -(speechBubbles[0].clientHeight / 2 - bottomDistance) + 'px';

            if (diagram.id === 'DiagrammDesicion_Content') {
                if (bodenbelastung <= 225 / 2) {
                    speechBubbles[0].classList.remove('right');
                    speechBubbles[0].classList.add('left');
                }
                else {
                    speechBubbles[0].classList.remove('left');
                    speechBubbles[0].classList.add('right');
                }
            }
        }
        else if (resultat === 1) {
            document.getElementById("terra-light-result-icon").src = "/images/accessories/ok.png";

            resultColorField.style.background = "#EAA74C";
            speechBubbles[1].classList.remove('d-none');
            speechBubbles[1].classList.add('d-inline');
            speechBubbles[1].style.bottom = -(speechBubbles[1].clientHeight / 2 - bottomDistance) + 'px';


            if (diagram.id === 'DiagrammDesicion_Content') {
                if (bodenbelastung <= 225 / 2) {
                    speechBubbles[1].classList.remove('right');
                    speechBubbles[1].classList.add('left');
                }
                else {
                    speechBubbles[1].classList.remove('left');
                    speechBubbles[1].classList.add('right');
                }
            }
        }
        else if (resultat === 2) {
            document.getElementById("terra-light-result-icon").src = "/images/accessories/bad.png";

            resultColorField.style.background = "#DC6464";
            speechBubbles[2].classList.remove('d-none');
            speechBubbles[2].classList.add('d-inline');
            speechBubbles[2].style.bottom = -(speechBubbles[2].clientHeight / 2 - bottomDistance) + 'px';

            if (diagram.id === 'DiagrammDesicion_Content') {
                if (bodenbelastung <= 225 / 2) {
                    speechBubbles[2].classList.remove('right');
                    speechBubbles[2].classList.add('left');
                }
                else {
                    speechBubbles[2].classList.remove('left');
                    speechBubbles[2].classList.add('right');
                }
            }
        }
    }

    var x;
    var y;
    var maxX;
    var maxY;

    var dia = getActiveDiagram();

    if ($(dia).attr('id') === "DiagrammDesicion_Content") {
        x = bodenbelastung;
        y = bodenfestigkeit;
        maxX = 225;
        maxY = 250;
    }
    else if ($(dia).attr('id') === "DiagrammStress_Content") {
        x = $(".slider")[0].noUiSlider.get() / 1000;
        y = $(".slider")[1].noUiSlider.get();

        if (globalCountryCode === 'QC') {
            y = y / 14.5038;
        }

        maxX = 12000 / 1000;
        maxY = 5;
    }

    else if ($(dia).attr('id') === "DiagrammSoil_Content") {
        x = $(".slider")[2].noUiSlider.get();
        y = $(".slider")[3].noUiSlider.get();
        maxX = 40;
        maxY = 60;
    }

    var validPixelsX = dia.clientWidth / 100 * 84.5255474453; // current image width / 100% * percentage of valid sector
    var validPixelsY = dia.clientHeight / 100 * 77.8443113772; // current image height / 100% * percentage of valid sector
    var otherPixelsX = dia.clientWidth / 100 * 10.5109489051; // current image width / 100% * percentage of invalid sector bottom left
    var otherPixelsY = dia.clientHeight / 100 * 9.1317365269; // current image height / 100% * percentage of invalid sector bottom left

    var pixelsLeft = validPixelsX / maxX * x + otherPixelsX; // (pixelsPerUnit * value) + startpoint x;
    var pixelsBottom = validPixelsY / maxY * y + otherPixelsY; // (pixelsPerUnit * value) + startpoint y;

    var wheel = dia.querySelector("#resultWheel");

    var smallerDiagramFactor = ((30 - (30 / 723 * dia.clientWidth)) / 2); //max wheel width - (max wheel width / (maxStartPointX + maxEndPointX) * diagram width) / 2 --> wheel stays in same size for all diagram sizes, therefore factor of procentage has to be subtracted if diagram becomes smaller

    wheel.style.left = pixelsLeft - smallerDiagramFactor + 'px';
    wheel.style.bottom = pixelsBottom - smallerDiagramFactor + 'px';
}

function applyValuesFromScenario() {
    checkboxes = document.getElementsByClassName("checkbox");
    var tyreLoad;
    var tyrePressure;
    var clay;
    var suction;

    for (var i = 0; i < checkboxes.length; i++) {
        if (checkboxes[i].checked) {
            tyreLoad = checkboxes[i].getAttribute("tyreLoad");
            tyrePressure = checkboxes[i].getAttribute("tyrePressure");
            clay = checkboxes[i].getAttribute("clay");
            suction = checkboxes[i].getAttribute("suction");
        }
    }

    updateLightDataForScenario(tyreLoad, tyrePressure, clay, suction);

    closeScenario();
}

function closeScenario() {
    selectedStepIndex = null;
    doFadeOut();
}
/* update UI end */

/* scenario handling in modal dialogs */
var currentStep = 0;
var currentDropdownIndex = 0;
var selectedStepIndex = null; //recreate selected partials when user turns device

function setSelectedStepIndex(step) {
    if (!$(step.children[0].children[0].children[0]).is(':checked')) {
        selectedStepIndex = step.children[0].children[0].children[0].getAttribute('id');
    }
    else {
        selectedStepIndex = null;
    }
}

function onDropdownChange() {
    $('body').on("change", "#dropdown", function (evt) {
        $("#terra-working-procedure-list").load("/load-and-pressure-working-step/" + $(this).val().toString());
    });
}
/* scenario handling in modal dialogs end */