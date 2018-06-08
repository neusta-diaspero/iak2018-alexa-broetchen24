
// 1. General Settings / Imports =======================================================================================

// Dialog messages
const messages = require('./messages.json');

// Global output/reprompt variables
let speechOutput;
let reprompt;

"use strict";
const Alexa = require('alexa-sdk');
const APP_ID = '';  // TODO replace with your app ID (OPTIONAL).


// 2. Skill Code =======================================================================================================

//
// Definition of skill states
//
//  START_MODE: Basic mode after LaunchRequest.
//  ORDER_MODE: Mode to place an order.
//
const states = {
    START_MODE: '_START',
    ORDER_MODE: '_ORDER_MODE',
    ORDER_CHECKOUT: '_ORDER_CHECKOUT'
};

// HANDLERS: INIT ======================================================================================================

const handlers_INIT = {
    'LaunchRequest': function () {
        // Redirect to START_MODE after welcome message
        this.handler.state = states.START_MODE;

        // Emit welcome message
        speechOutput = randomPhrase(messages.INIT.WELCOME) + ' ' + randomPhrase(messages.INIT.ACTION);
        reprompt = randomPhrase(messages.INIT.ACTION);
        this.response.speak(speechOutput).listen(reprompt);
        this.emit(':responseReady');
    },
    'SessionEndedRequest': function () {
        speechOutput = randomPhrase(messages.GENERAL.GOODBYE);
        this.response.speak(speechOutput);
        this.emit(':responseReady');
    },
    'StartOrderIntent': function () {
        // User wants to start an order. Redirect to 'NewSession' in state ORDER_MODE.
        this.handler.state = states.ORDER_MODE;
        this.emitWithState('NewSession');
    },
    'Unhandled': function () {
        // Redirect to START_MODE after 'unhandled' message
        this.handler.state = states.START_MODE;

        speechOutput = randomPhrase(messages.START.UNHANDLED);
        reprompt = randomPhrase(messages.INIT.ACTION);
        this.response.speak(speechOutput).listen(reprompt);
        this.emit(':responseReady');
    }
};

// HANDLERS: START_MODE ================================================================================================

const handlers_START_MODE = Alexa.CreateStateHandler(states.START_MODE, {
    'NewSession': function () {
        speechOutput = randomPhrase(messages.START.ACTION);
        reprompt = randomPhrase(messages.START.HELP);
        this.response.speak(speechOutput).listen(reprompt);
        this.emit(':responseReady');
    },
    'StartOrderIntent': function () {
        // redirect to ORDER_MODE
        this.handler.state = states.ORDER_MODE;
        this.emitWithState('NewSession');
    },
    'AMAZON.HelpIntent': function () {
        speechOutput = randomPhrase(messages.START.HELP);
        this.response.speak(speechOutput).listen(reprompt);
        this.emit(':responseReady');
    },
    'AMAZON.CancelIntent': function () {
        // redirect to AMAZON.StopIntent in current state
        this.emitWithState('AMAZON.StopIntent');
    },
    'AMAZON.StopIntent': function () {
        speechOutput = randomPhrase(messages.GENERAL.GOODBYE);
        this.response.speak(speechOutput);
        this.emit(':responseReady');
    },
    'SessionEndedRequest': function () {
        speechOutput = randomPhrase(messages.GENERAL.GOODBYE);
        this.response.speak(speechOutput);
        this.emit(':responseReady');
    },
    'Unhandled': function () {
        speechOutput = randomPhrase(messages.START.UNHANDLED);
        reprompt = randomPhrase(messages.INIT.ACTION);
        this.response.speak(speechOutput).listen(reprompt);
        this.emit(':responseReady');
    }
});


// HANDLERS: ORDER_MODE ================================================================================================

const handlers_ORDER_MODE = Alexa.CreateStateHandler(states.ORDER_MODE, {
    'NewSession': function () {
        // empty basket
        this.attributes['basket'] = [];

        // Emit order welcome message
        speechOutput = randomPhrase(messages.ORDER_MODE.ORDER_INIT);
        reprompt = randomPhrase(messages.ORDER_MODE.HELP);
        this.response.speak(speechOutput).listen(reprompt);
        this.emit(':responseReady');
    },
    'SelectProductIntent': function () {

        // order variables – to be filled with request
        let orderItem;
        let product = '';
        let quantity = 1;

        // get product from request
        let slotName = "product";
        let slotValue = isSlotValid(this.event.request, slotName);
        if (slotValue) {

                const intentObj = this.event.request.intent;
                product = resolveCanonical(intentObj.slots.product, 'name');

        }

        // get quantity from request
        slotName = "quantity";
        slotValue = isSlotValid(this.event.request, slotName);
        if (slotValue) {
            // fallback for TestFlow, because it can't resolve canonicals.

                const intentObj = this.event.request.intent;
                quantity = resolveCanonical(intentObj.slots.quantity, 'id');

        }

        // use variables pulled from request and push orderItem to session attribute 'basket'
        orderItem = {
            "QUANTITY": quantity,
            "PRODUCT": product
        };
        this.attributes['basket'].push(orderItem);

        speechOutput = randomPhrase(messages.ORDER_MODE.PRODUCT_ADDED_TO_ORDER) + ' ' + randomPhrase(messages.ORDER_MODE.ASK_FOR_MORE);
        reprompt = randomPhrase(messages.ORDER_MODE.ASK_FOR_MORE);
        this.response.speak(speechOutput).listen(reprompt);
        this.emit(':responseReady');

    },
    'ListCurrentOrderIntent': function () {

        // iterate current basket
        let basketOutput = '';

        this.attributes['basket'].forEach(function (orderItem) {
            if(basketOutput.length > 0){
                basketOutput += ' und ';
            }
            basketOutput += orderItem.QUANTITY + ' ' + orderItem.PRODUCT;

        });

        // ask user if he wants to continue order
        speechOutput = 'Deine Bestellung enthält ' + basketOutput + '. ';
        speechOutput += randomPhrase(messages.ORDER_MODE.ASK_FOR_MORE);
        reprompt = randomPhrase(messages.ORDER_MODE.ASK_FOR_MORE);
        this.response.speak(speechOutput).listen(reprompt);
        this.emit(':responseReady');
    },
    'AMAZON.YesIntent': function () {
        // continue order and redirect ask to prompt next product
        speechOutput = randomPhrase(messages.ORDER_MODE.ORDER_NEXT);
        reprompt = speechOutput;
        this.response.speak(speechOutput).listen(reprompt);
        this.emit(':responseReady');
    },
    'AMAZON.NoIntent': function () {
        // user doesn't want to add more products to basket. therefore redirect to state ORDER_CHECKOUT.
        this.handler.state = states.ORDER_CHECKOUT;
        this.emitWithState('NewSession');
    },
    'AMAZON.HelpIntent': function () {
        speechOutput = randomPhrase(messages.ORDER_MODE.HELP);
        this.response.speak(speechOutput).listen(reprompt);
        this.emit(':responseReady');
    },
    'AMAZON.CancelIntent': function () {
        // redirect back to START_MODE
        this.handler.state = states.START_MODE;
        this.emitWithState('AMAZON.CancelIntent');
    },
    'AMAZON.StopIntent': function () {
        // redirect back to START_MODE
        this.handler.state = states.START_MODE;
        this.emitWithState('AMAZON.StopIntent');
    },
    'Unhandled': function () {
        speechOutput = randomPhrase(messages.ORDER_MODE.UNHANDLED);
        reprompt = randomPhrase(messages.ORDER_MODE.HELP);
        this.response.speak(speechOutput).listen(reprompt);
        this.emit(':responseReady');
    }
});


// HANDLERS: ORDER_CHECKOUT ============================================================================================

const handlers_ORDER_CHECKOUT = Alexa.CreateStateHandler(states.ORDER_CHECKOUT, {
    'NewSession': function () {

        // iterate through current basket
        let basketOutput = '';

        this.attributes['basket'].forEach(function (orderItem) {
            if(basketOutput.length > 0){
                basketOutput += ' und ';
            }
            basketOutput += orderItem.QUANTITY + ' ' + orderItem.PRODUCT;

        });

        // ask user if he wants to checkout current basket
        speechOutput = randomPhrase(messages.ORDER_CHECKOUT.ORDER_CONTAINS) + basketOutput + '. ';
        speechOutput += randomPhrase(messages.ORDER_CHECKOUT.ORDER_SUBMIT);
        reprompt = randomPhrase(messages.ORDER_CHECKOUT.ORDER_SUBMIT);
        this.response.speak(speechOutput).listen(reprompt);
        this.emit(':responseReady');
    },
    'AMAZON.YesIntent': function () {
        // TODO: order handling thus user wants to place order
        speechOutput = 'Okay. Deine Bestellung wurde erfolgreich an Brötchen 24 übermittelt. ' + randomPhrase(messages.ORDER_CHECKOUT.ORDER_SUCCESS);
        this.response.speak(speechOutput);
        this.emit(':responseReady');
    },
    'AMAZON.NoIntent': function () {
        // TODO: user doesn't want to place order
        this.attributes['basket'] = null;

        // user doesn't want to add more products to basket. therefore redirect to state ORDER_CHECKOUT.
        this.handler.state = states.START_MODE;
        this.emitWithState('NewSession');
    },
    'AMAZON.HelpIntent': function () {
        speechOutput = randomPhrase(messages.ORDER_CHECKOUT.HELP);
        this.response.speak(speechOutput).listen(reprompt);
        this.emit(':responseReady');
    },
    'AMAZON.CancelIntent': function () {
        // redirect back to START_MODE
        this.handler.state = states.START_MODE;
        this.emitWithState('AMAZON.CancelIntent');
    },
    'AMAZON.StopIntent': function () {
        // redirect back to START_MODE
        this.handler.state = states.START_MODE;
        this.emitWithState('AMAZON.StopIntent');
    },
    'Unhandled': function () {
        speechOutput = randomPhrase(messages.ORDER_CHECKOUT.UNHANDLED);
        reprompt = randomPhrase(messages.ORDER_CHECKOUT.HELP);
        this.response.speak(speechOutput).listen(reprompt);
        this.emit(':responseReady');
    }
});


// Handler and Skill Management ========================================================================================

exports.handler = (event, context) => {
    const alexa = Alexa.handler(event, context);
    alexa.appId = APP_ID;
    // To enable string internationalization (i18n) features, set a resources object.
    //alexa.resources = languageStrings;
    alexa.registerHandlers(
        handlers_INIT,
        handlers_START_MODE,
        handlers_ORDER_MODE,
        handlers_ORDER_CHECKOUT
    );
    //alexa.dynamoDBTableName = 'DYNAMODB_TABLE_NAME'; //uncomment this line to save attributes to DB
    alexa.execute();
};

// 3. Helper Function  =================================================================================================

function resolveCanonical(slot){
    //this function looks at the entity resolution part of request and returns the slot value if a synonyms is provided
    let canonical;
    try{
        canonical = slot.resolutions.resolutionsPerAuthority[0].values[0].value.name;
    }catch(err){
        console.log(err.message);
        canonical = slot.value;
    };
    return canonical;
};


function randomPhrase(array) {
    // the argument is an array [] of words or phrases
    let i = 0;
    i = Math.floor(Math.random() * array.length);
    return(array[i]);
}
function isSlotValid(request, slotName){
    let slot = request.intent.slots[slotName];
    //console.log("request = "+JSON.stringify(request)); //uncomment if you want to see the request
    let slotValue;

    //if we have a slot, get the text and store it into speechOutput
    if (slot && slot.value) {
        //we have a value in the slot
        slotValue = slot.value.toLowerCase();
        return slotValue;
    } else {
        //we didn't get a value in the slot.
        return false;
    }
}

