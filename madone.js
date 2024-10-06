'use strict';

//Declare global variables
let timePara;
let distancePara;
let activeField;
let timeValue = 0;
let distanceValue = 0;
let tracking = false;
let startPosition;
let watchID;
let inclineZone;
let inclinePrompt;
let startTime;
let totalDistance = 0;

//Handles clicks on a button
const buttonClickHandler = function(evt){
    const buttonText = evt.target.innerText;

    //If tracking is active
    if (tracking) {
        //Stop tracking if 'Stop' button is clicked
        if (buttonText === 'Stop') {
            stopTracking();
            return;
        }
        return;
    }

    //Handle button clicks for numeric input, clear amd backspace
    if (/[0-9]/.test(buttonText)) {
        addToActiveField(buttonText);
    } else if (buttonText === 'C') {
        resetActiveField();
    } else if (buttonText === '⇦') {
        removeRightMostDigit();
    }

    //Update displayed values
    updateDisplayedValues();
};

//Function to show incline information using device orientation
const showIncline = function(){
    //Function to handle device orientation events
    const handleOrientation = (event) => {
    const beta = event.beta;

    //Check if the device is flat on the ground and is a climbable hill
        if (Math.abs(beta) > 45){
            inclinePrompt.innerText = '◬ Lay device flat on the ground/hill ◬';
            return;
        }

        //Calculate and display incline information
        const inclinePercentage = Math.round((beta / 45) * 100);
        const inclineSign = beta >= 0 ? 'uphill' : 'downhill';
        inclinePrompt.innerText = `◬ Incline: ${Math.min(Math.abs(inclinePercentage), 100)}% ${inclineSign} (${Math.round(beta)}°) ◬`;
    };

    //Add event listener for device orientation
    window.addEventListener('deviceorientation', handleOrientation);

    //Display initial incline prompt
    inclinePrompt.innerText = '◬ Tap to show incline ◬';

    //Remove event listener after 30 seconds
    setTimeout(() => {
        inclinePrompt.innerText = '◬ Tap to show incline ◬';
        window.removeEventListener('deviceorientation', handleOrientation);
    }, 30000);
};

//Function to add a digit to the active field
const addToActiveField = function(value) {
    if (activeField === 'time') {
        const updatedTimeValue = parseInt(timeValue.toString() + value);
        if (updatedTimeValue <= 999) {
            timeValue = updatedTimeValue;
        }
    } else if (activeField === 'distance') {
        const updatedDistanceValue = parseInt(distanceValue.toString() + value);
        if (updatedDistanceValue <= 99999) {
            distanceValue = updatedDistanceValue;
        }
    }
};

//Function to reset the active field
const resetActiveField = function () {
    if (activeField === 'time') {
        timeValue = 0;
    } else if (activeField === 'distance') {
        distanceValue = 0;
    }
};

//Function to remove rightmost digit from activeField
const removeRightMostDigit = function() {
    if (activeField === 'time') {
        timeValue = Math.floor(timeValue / 10);
        if (timeValue < 0) {
            timeValue = 0;
        }
    } else if (activeField === 'distance') {
        distanceValue = Math.floor(distanceValue / 10);
        if (distanceValue < 0) {
            distanceValue = 0;
        }
    }
};

//Function to update the displayed values
const updateDisplayedValues = function() {
    if (activeField === 'time') {
        timePara.innerText = timeValue + '|';
        distancePara.innerText = distanceValue;
    } else if (activeField === 'distance') {
        timePara.innerText = timeValue;
        distancePara.innerText = distanceValue + '|';
    }

    //Update pace information if conditions are met
    const pacePara = document.getElementById("pace");
    if (distanceValue >= 10 && timeValue >= 5) {
        const pace = (timeValue / (distanceValue / 1000));
        pacePara.innerText = pace.toFixed(0) + ' mins/km';
    } else {
        pacePara.innerText = '--';
    }
};

//Called on page show - use to intialise variables and any startup code
const init = function() {
    timePara = document.getElementById("time");
    distancePara = document.getElementById("distance");

    //Retrieve time and distance values from local storage or set default values
    timeValue = localStorage.getItem("timeValue") || 0;
    distanceValue = localStorage.getItem("distanceValue") || 0;

    activeField = 'distance';
    timePara.innerText = timeValue;
    distancePara.innerText = distanceValue + '|';

    //Update displayed values
    updateDisplayedValues();

    //Set up event listeners for numeric keypad buttons
    for (let i = 0; i <= 9; i++) {
        document.getElementById("b" + i).addEventListener("click", buttonClickHandler);
    }

    //Set up event listeners for clear and backspace buttons
    document.getElementById("bC").addEventListener("click", buttonClickHandler);
    document.getElementById("bBackspace").addEventListener("click", buttonClickHandler);

    //Set up event listeners for time and distance fields
    timePara.addEventListener("click", function() {
        activeField = 'time';
        updateDisplayedValues();
    });
    distancePara.addEventListener("click", function() {
        activeField = 'distance';
        updateDisplayedValues();
    });

    //Set up event listener for the start button
    const startButton = document.getElementById("startButton");
    startButton.addEventListener("click", function() {
        if (!tracking) {
            startTracking();
        } else {
            stopTracking();
        }
    });

    //Set up event listeners for incline zone
    inclineZone = document.getElementById("inclinezone");
    inclinePrompt = document.getElementById("incline-prompt");
    inclineZone.addEventListener("click", showIncline);
};

//Function to start tracking location
const startTracking = function() {
    tracking = true;
    startPosition = null;
    const startButton = document.getElementById("startButton");
    startButton.innerText = "Stop";

    //Start watching for geolocation updates
    watchID = navigator.geolocation.watchPosition(updateLiveStats);
};

//Function to stop tracking location
const stopTracking = function() {
    tracking = false;
    const startButton = document.getElementById("startButton");
    startButton.innerText = "Start";

    //Stop watching for geolocation updates
    navigator.geolocation.clearWatch(watchID);

    //Reset live distance and average pace
    const liveDistancePara = document.getElementById("live-distance");
    liveDistancePara.innerText = '';

    const averagePacePara = document.getElementById("average-pace");
    averagePacePara.innerText = '';

    //Reset total distance and start time
    totalDistance = 0;
    startTime = new Date();
};

//Function to update live distance and average pace based on geolocation data
const updateLiveStats = function(position) {
    if (!startPosition) {
        startPosition = position.coords;
        startTime = new Date();
        return;
    }

    //Calculate current distance using Haversine formula
    const currentDistance = calculateHaversineDistance(startPosition.latitude, startPosition.longitude, position.coords.latitude, position.coords.longitude);
    const liveDistancePara = document.getElementById("live-distance");
    liveDistancePara.innerText = `Live Distance: ${Math.round(currentDistance)} m`;

    //Calculate elapsed time and update average pace
    const currentTime = new Date();
    const elapsedTimeInSeconds = (currentTime - startTime) / 1000;

    const averagePacePara = document.getElementById("average-pace");
    if (currentDistance >= 10 && elapsedTimeInSeconds >=5) {
        const averagePace = (elapsedTimeInSeconds / (currentDistance / 1000)) / 60;
        averagePacePara.innerText = `Average Pace: ${averagePace.toFixed(0)} mins/km`;
    } else {
        averagePacePara.innerText = 'Average Pace: 0 mins/km';
    }
};

//Function to calculate Haversine distance between two coordinates
const calculateHaversineDistance = function(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c * 1000; // Distance in meters
    return distance;
};

//Save data to local storage before the page is unloaded
window.addEventListener("beforeunload", function() {
    localStorage.setItem("timeValue", timeValue);
    localStorage.setItem("distanceValue", distanceValue);
});

//Initialize the application on page show
window.addEventListener("pageshow", init);