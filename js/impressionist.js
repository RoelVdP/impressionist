/**
 * Impressionist.js - A visual editor for impress.js
 *
 * This is the main JS file for the browser / renderer process side of Impressionist. By running
 * `node build.js` this is concatenated with all the `src/plugins/*` into `js/impressionist.js`,
 * which is the file actually used in a browser / Electron renderer process.
 *
 * This file simply exposes a global function `impressionist()`, which returns an object that is
 * the impressionist api. This is exactly analogous to how `impress()` returns the impress api.
 *
 * Currently this file doesn't include any core functionality or interesting api. The only
 * functions you can actually call in the api are common utility functions like 
 * `impressionist().util.toNumber()`.
 *
 * Henrik Ingo (c) 2016
 * MIT License
 */
(function ( document, window ) {
    'use strict';
    
    // Populated by separate library plugins, see src/lib/*
    var impressionistApi = {};

    window.impressionist = function(){
        return impressionistApi;
    };

})(document, window);

/**
 * Helper functions to create CSS3 strings
 * 
 * Henrik Ingo (c) 2016
 * MIT License
 *
 * Mostly copied from impress.js, same license.
 */
(function ( document, window ) {
    'use strict';

    if( impressionist().css3 === undefined ){
        impressionist().css3 = {}
    }

    // `translate` builds a translate transform string for given data.
    impressionist().css3.translate = function ( t ) {
        return " translate3d(" + t.x + "px," + t.y + "px," + t.z + "px) ";
    };
    
    // `rotate` builds a rotate transform string for given data.
    // By default the rotations are in X Y Z order that can be reverted by passing `true`
    // as second parameter.
    impressionist().css3.rotate = function ( r, revert ) {
        var order = r.order ? r.order : "xyz";
        var css = "";
        var axes = order.split("");
        if ( revert ) {
            axes = axes.reverse();
        }

        for ( var i in axes ) {
            css += " rotate" + axes[i].toUpperCase() + "(" + r[axes[i]] + "deg)"
        }
        return css;
    };
    
    // `scale` builds a scale transform string for given data.
    impressionist().css3.scale = function ( s ) {
        return " scale(" + s + ") ";
    };

    // `perspective` builds a perspective transform string for given data.
    impressionist().css3.perspective = function ( p ) {
        return " perspective(" + p + "px) ";
    };

    // `css` function applies the styles given in `props` object to the element
    // given as `el`. It runs all property names through `pfx` function to make
    // sure proper prefixed version of the property is used.
    impressionist().css3.css = function ( el, props ) {
        var key, pkey;
        for ( key in props ) {
            if ( props.hasOwnProperty(key) ) {
                pkey = key;
                if ( pkey !== null ) {
                    el.style[pkey] = props[key];
                }
            }
        }
        return el;
    };

    impressionist().css3.computeWindowScale = function ( config ) {
        var hScale = window.innerHeight / config.height,
            wScale = window.innerWidth / config.width,
            scale = hScale > wScale ? wScale : hScale;
        if (config.maxScale && scale > config.maxScale) {
            scale = config.maxScale;
        }
        if (config.minScale && scale < config.minScale) {
            scale = config.minScale;
        }
        return scale;
    };
    
})(document, window);

/**
 * Garbage collection utility
 *
 * Impressionist features that add their own elements to the DOM of a presentation, can register
 * those elements with the garbage collector. The garbage collector will then remove them when
 * the document is saved, so that there's no trace of impressionist left in the document.
 *
 * Henrik Ingo (c) 2016
 * MIT License
 */
(function ( document, window ) {
    'use strict';

    var elementList = [];
    var eventListenerList = [];
    var id = Math.random();

    if( impressionist().gc === undefined ){
        impressionist().gc = {}
    }

    impressionist().gc.pushElement = function ( element ) {
        elementList.push(element);
    };

    // Convenience wrapper that combines DOM appendChild with gc.pushElement
    impressionist().gc.appendChild = function ( parent, element ) {
        parent.appendChild(element);
        impressionist().gc.pushElement(element);
    };

    impressionist().gc.pushEventListener = function ( target, type, listenerFunction ) {
        eventListenerList.push( {target:target, type:type, listener:listenerFunction} );
    };

    // Convenience wrapper that combines DOM addEventListener with gc.pushEventListener
    impressionist().gc.addEventListener = function ( target, type, listenerFunction ) {
        target.addEventListener( type, listenerFunction );
        impressionist().gc.pushEventListener( target, type, listenerFunction );
    };

    impressionist().gc.removeAll = function () {
        tinymceCssHack();
        for ( var i in elementList ) {
            elementList[i].parentElement.removeChild(elementList[i]);
        }
        elementList = [];
        for ( var i in eventListenerList ) {
            var target   = eventListenerList[i].target;
            var type     = eventListenerList[i].type;
            var listener = eventListenerList[i].listener;
            target.removeEventListener(type, listener);
        }
    };

    // These css are added by tinymce asynchronously, and it doesn't provide a callback
    // api where I could do this when they're added. So we just capture them here, right before
    // we're going to call removeChild() on them.
    var tinymceCssHack = function () {
        var css1 = "skins/lightgray/skin.min.css";
        var css2 = "skins/lightgray/content.inline.min.css";
        var links = document.head.querySelectorAll("link");
        for (var i = 0; i < links.length; i++){
            var l = links[i];
            if( l.href.substring( l.href.length - css1.length ) == css1 || 
                l.href.substring( l.href.length - css2.length ) == css2 ){
                impressionist().gc.pushElement(l);
            }
        }
        
        var mceElements = document.querySelectorAll(".mce-content-body")
        for ( var i = 0; i < mceElements.length; i++ ) {
            mceElements[i].classList.remove("mce-content-body");
            mceElements[i].classList.remove("mce-edit-focus");
            mceElements[i].removeAttribute("contenteditable");
            mceElements[i].removeAttribute("spellcheck");
        }
        var mceElements = document.querySelectorAll("br")
        for ( var i = 0; i < mceElements.length; i++ ) {
            if ( mceElements[i].getAttribute("data-mce-bogus") == "1" ) {
                mceElements[i].parentElement.removeChild(mceElements[i]);
            }
        }
        var mceElements = document.querySelectorAll(".mce-widget")
        for ( var i = 0; i < mceElements.length; i++ ) {
            mceElements[i].parentElement.removeChild(mceElements[i]);
        }
        var mceElements = document.querySelectorAll(".mce-container")
        for ( var i = 0; i < mceElements.length; i++ ) {
            mceElements[i].parentElement.removeChild(mceElements[i]);
        }
        document.body.removeAttribute("spellcheck");

        var style = document.getElementById("mceDefaultStyles");
        impressionist().gc.pushElement(style);
    };

})(document, window);

/**
 * Utilities library functions
 *
 * Henrik Ingo (c) 2016
 * MIT License
 *
 * Parts copied from impress.js, same license.
 */
(function ( document, window ) {
    'use strict';

    if( impressionist().util === undefined ){
        impressionist().util = {}
    }

    impressionist().util.toNumber = function (numeric, fallback) {
        return isNaN(numeric) ? (fallback || 0) : Number(numeric);
    };
    
    impressionist().util.triggerEvent = function (el, eventName, detail) {
        var event = document.createEvent("CustomEvent");
        event.initCustomEvent(eventName, true, true, detail);
        el.dispatchEvent(event);
    };

    impressionist().util.makeDomElement = function ( html ) {
        var tempDiv = document.createElement("div");
        tempDiv.innerHTML = html;
        return tempDiv.firstChild;
    };
    
    impressionist().util.loadJavaScript = function ( url, callback ) {
        var script = document.createElement("script");
        script.src = url;
        script.type = "text/javascript";
        script.onreadystatechange = callback;
        script.onload = callback;
        document.head.appendChild(script);
        return script;
    };
    
    impressionist().util.loadCss = function ( url, callback ) {
        var link = document.createElement("link");
        link.href = url;
        link.rel = "stylesheet";
        link.type = "text/css";
        link.onreadystatechange = callback;
        link.onload = callback;
        document.head.appendChild(link);
        return link;
    };
    
})(document, window);

/**
 * Camera plugin
 *
 * The camera allows to navigate and view your presentation from an arbitrary angle and scaling.
 *
 * Copyright 2016 Henrik Ingo (@henrikingo)
 * Released under the MIT license.
 */
(function ( document, window ) {
    'use strict';
    var toolbar;
    var coordinates = {rotate:{x:0,y:0,z:0},translate:{x:0,y:0,z:0,order:"xyz"},scale:1};
    var widgets = {};
    var widgetNames = ['x', 'y', 'z', 'scale', 'rotateX', 'rotateY', 'rotateZ', 'order'];
    var activeStep;
    var util = impressionist().util;
    var css3 = impressionist().css3;

    // Functions for zooming and panning the canvas //////////////////////////////////////////////


    // Get user input values and move/scale canvas accordingly
    var updateCanvasPosition = function() {
        var root = document.getElementById("impress");
        var rootData = root.dataset;
        var config = {
                width: util.toNumber( rootData.width, 1024 ),
                height: util.toNumber( rootData.height, 768 ),
                maxScale: util.toNumber( rootData.maxScale, 1 ),
                minScale: util.toNumber( rootData.minScale, 0 ),
                perspective: util.toNumber( rootData.perspective, 1000 )
        };
        var canvas = root.firstChild;
        var activeStep = document.querySelector("div#impress div.step.active");
        var stepData = activeStep.dataset;

        // compute target state of the canvas based on given step
        var target = {
            rotate: {
                x: -coordinates.rotate.x,
                y: -coordinates.rotate.y,
                z: -coordinates.rotate.z,
                order: coordinates.rotate.order
            },
            translate: {
                x: -coordinates.translate.x,
                y: -coordinates.translate.y,
                z: -coordinates.translate.z
            },
            scale: 1 / coordinates.scale
        };

        var windowScale = css3.computeWindowScale(config);
        var targetScale = target.scale * windowScale;

        css3.css(root, {
            // to keep the perspective look similar for different scales
            // we need to 'scale' the perspective, too
            transform: css3.perspective( config.perspective / targetScale ) + css3.scale( targetScale ),
            transitionDuration: "0ms",
            transitionDelay: "0ms"
        });
        css3.css(canvas, {
            transform: css3.rotate(target.rotate, true) + css3.translate(target.translate),
            transitionDuration: "0ms",
            transitionDelay: "0ms"
        });
    };


    // Helper function to set the right path in `coordinates` object, given a name from widgetNames
    var setCoordinate = function( name, value ) {
        if ( name.length == 1 ) { // x, y, z
            coordinates.translate[name] = value;
        }
        else if ( name == "scale" ) {
            coordinates.scale = value;
        }
        else if ( name == "order" ) {
            coordinates.rotate.order = value;
        }
        else {
            var xyz = name.substr(-1).toLowerCase();
            coordinates.rotate[xyz] = value;
        }
    };
    // Helper function to get the right path in `coordinates` object, given a name from widgetNames
    var getCoordinate = function( name ) {
        if ( name.length == 1 ) { // x, y, z
            return coordinates.translate[name];
        }
        else if ( name == "scale" ) {
            return coordinates.scale;
        }
        else if ( name == "order" ) {
            return coordinates.rotate.order;
        }
        else {
            var xyz = name.substr(-1).toLowerCase();
            return coordinates.rotate[xyz];
        }
    };

    // Set event listeners for widgets.x.input/plus/minus widgets.
    var setListeners = function( widgets, name ){
        if (name == "order") return; // The last widget is non-numeric, separate listeners set explicitly.

        widgets[name].input.addEventListener( "input", function( event ) {
            setCoordinate( name, util.toNumber( event.target.value, name=="scale"?1:0 ) );
            updateCanvasPosition();
        });
        widgets[name].minus.addEventListener( "click", function( event ) {
            setCoordinate( name, Math.round(getCoordinate(name)-1) );
            // But scale cannot be < 1
            if( name == "scale" && getCoordinate( name ) < 1 )
                setCoordinate( name, 1 );
            updateWidgets();
            updateCanvasPosition();
        });
        widgets[name].plus.addEventListener( "click", function( event ) {
            setCoordinate( name, Math.round(getCoordinate(name)+1) );
            updateWidgets();
            updateCanvasPosition();
        });
    };

    var addCameraControls = function() {
        widgetNames.forEach( function(name){
            var r = name == "rotateX" ? "rotate: " : "";
            var label = name.substr(0,6)=="rotate" ? name.substr(-1).toLowerCase() : name;
            var element = util.makeDomElement( '<span>' + r + label + 
                                          ':<input id="impressionist-camera-' + name + 
                                          '" class="impressionist-camera impressionist-camera-input" type="text" />' +
                                          '<button id="impressionist-camera-' + name + '-minus" ' +
                                          'class="impressionist-camera impressionist-camera-minus">-</button>' + 
                                          '<button id="impressionist-camera-' + name + '-plus" ' +
                                          'class="impressionist-camera impressionist-camera-plus">+</button> </span>' );
            util.triggerEvent(toolbar, "impressionist:toolbar:appendChild", { group : 0, element : element } );
            
            var input = element.firstElementChild;
            var minus = input.nextSibling;
            var plus  = minus.nextSibling;
            widgets[name] = { minus : minus, input : input, plus : plus };
            setListeners( widgets, name );
        });
        // order widget has its own listeners, as it's not a numeric field
        var name = "order";
        widgets[name].input.addEventListener( "input", function( event ) {
            var v = event.target.value.toString().toLowerCase();
            var value = "";
            for (var i = 0; i < Math.min(v.length, 3); i++){
                if( v[i] != "x" && v[i] != "y" && v[i] != "z" ){
                    continue;
                }
                value += v[i];
            }
            event.target.value = value;
            setCoordinate( name, value );
            updateCanvasPosition();
        });
        widgets[name].minus.addEventListener( "click", function( event ) {
            var current = getCoordinate(name);
            var value = "";
            if( current.length < 3 ) {
                var available = "xyz";
                for( var i=0; i < current.length; i++ ) {
                    // Remove the letters already in the text field from available
                    available = available.split(current[i]).join("");
                }
                value = current + available[0];
            }
            else {
                // shift the order string so that 1st letter becomes last, second first, third second.
                value = current[1] + current[2] + current[0];
            }
            setCoordinate( name, value );
            updateWidgets();
            updateCanvasPosition();
        });
        widgets[name].plus.addEventListener( "click", function( event ) {
            var current = getCoordinate(name);
            var value = "";
            if( current.length < 3 ) {
                var available = "xyz";
                for( var i=0; i < current.length; i++ ) {
                    // Remove the letters already in the text field from available
                    available = available.split(current[i]).join("");
                }
                value = available[0] + current;
            }
            else {
                // shift the order string so that 1st letter becomes last, second first, third second.
                value =  current[2] + current[0] + current[1];
            }
            setCoordinate( name, value );
            updateWidgets();
            updateCanvasPosition();
        });
    };
    
    // Update the coordinates object from the currently activeStep.
    // IOW this assumes that the canvas positioning in fact matches the attributes of the activeStep,
    // which is at least true for example immediately after impress:stepenter event.
    var getActiveStepCoordinates = function(activeStep) {
        var stepData = activeStep.dataset;
        coordinates = {
            rotate: {
                x: util.toNumber(stepData.rotateX),
                y: util.toNumber(stepData.rotateY),
                z: util.toNumber(stepData.rotateZ, util.toNumber(stepData.rotate)),
                order: "xyz" // TODO: Not supported in impress.js yet, so all existing steps have this order for now
            },
            translate: {
                x: util.toNumber(stepData.x),
                y: util.toNumber(stepData.y),
                z: util.toNumber(stepData.z)
            },
            scale: util.toNumber(stepData.scale, 1)
        };
    };

    var updateWidgets = function() {
        widgetNames.forEach( function( name ) {
            widgets[name].input.value = getCoordinate(name);
        });
    };

    // API for other plugins to move the camera position ///////////////////////////////////////////
    var gc = impressionist().gc;
    gc.addEventListener(document, "impressionist:camera:setCoordinates", function (event) {
        var moveTo = event.detail;
        widgetNames.forEach( function( name ) {
            if ( moveTo[name] === undefined ) return; // continue, but in JS forEach is a function
            if ( name == "order" ) {
                // TODO: Could do input sanitization here, but for now we actually trust the plugins that will use this so...
                setCoordinate( name, moveTo[name] );
            }
            else {
                setCoordinate( name, util.toNumber( moveTo[name], getCoordinate(name) ) );
            }
        });
        updateWidgets();
        updateCanvasPosition();
    });

    // impress.js events ///////////////////////////////////////////////////////////////////////////
    
    gc.addEventListener(document, "impressionist:toolbar:init", function (event) {
        toolbar = event.detail.toolbar;
        addCameraControls( event );
        util.triggerEvent( toolbar, "impressionist:camera:init", { "widgets" : widgets } );
        activeStep = document.querySelector("#impress .step.active");
        getActiveStepCoordinates(activeStep);
        updateWidgets();
    });
    
    // If user moves to another step with impress().prev() / .next() or .goto(), then the canvas
    // will be set according to that step. We update our widgets to reflect reality.
    // From here, user can again zoom out or pan away as he prefers.
    gc.addEventListener(document, "impress:stepenter", function (event) {
        activeStep = event.target;
        getActiveStepCoordinates(activeStep);
        updateWidgets();
    });

    // impress.js also resets the css coordinates when a window is resized event. Wait a second,
    // then update widgets to match reality.
    gc.addEventListener(window, "resize", function () {
        window.setTimeout( function(){
            getActiveStepCoordinates(activeStep);
            updateWidgets();
        }, 1000 );
    });
    
})(document, window);


/**
 * Camera-controls plugin
 *
 * Buttons to navigate the camera
 *
 * Copyright 2016 Henrik Ingo (@henrikingo)
 * Released under the MIT license.
 */
(function ( document, window ) {
    'use strict';
    var toolbar;
    var cameraCoordinates;
    var myWidgets = {};
    var rotationAxisLock = {x:false, y:false, z:false};
    var util = impressionist().util;
    var gc = impressionist().gc;

    // Functions for zooming and panning the canvas //////////////////////////////////////////////

    // Create widgets and add them to the impressionist toolbar //////////////////////////////////
    var round = function(coord) {
        var keys = ["x", "y", "z", "rotateX", "rotateY", "rotateZ"];
        for (var i in keys ) {
            coord[keys[i]] = Math.round( coord[ keys[i] ] );
        }
        return coord;
    };

    var addCameraControls = function() {
        util.triggerEvent(toolbar, "impressionist:toolbar:groupTitle", { group: 0, title: "Camera" } )
        myWidgets.xy = util.makeDomElement( '<button id="impressionist-cameracontrols-xy" title="Pan camera left-right, up-down">+</button>' );
        myWidgets.z  = util.makeDomElement( '<button id="impressionist-cameracontrols-z" title="Zoom in-out = up-down, rotate = left-right">Z</button>' );
        myWidgets.rotateXY = util.makeDomElement( '<button id="impressionist-cameracontrols-rotate" title="Rotate camera left-right, up-down">O</button>' );

        util.triggerEvent(toolbar, "impressionist:toolbar:appendChild", { group : 0, element : myWidgets.xy } );
        util.triggerEvent(toolbar, "impressionist:toolbar:appendChild", { group : 0, element : myWidgets.z } );
        util.triggerEvent(toolbar, "impressionist:toolbar:appendChild", { group : 0, element : myWidgets.rotateXY } );

        var initDrag = function(event) {
            var drag = {};
            drag.start = {};
            drag.start.x = event.clientX;
            drag.start.y = event.clientY;
            drag.current = {};
            drag.current.x = event.clientX;
            drag.current.y = event.clientY;
            return drag;
        };
        var stopDrag = function() {
            myWidgets.xy.drag = false;
            myWidgets.z.drag = false;
            myWidgets.rotateXY.drag = false;
        };
        
        myWidgets.xy.addEventListener( "mousedown", function( event ) {
            myWidgets.xy.drag = initDrag(event);
            updateCameraCoordinatesFiber(); // start fiber
        });
        myWidgets.z.addEventListener( "mousedown", function( event ) {
            myWidgets.z.drag = initDrag(event);
            updateCameraCoordinatesFiber(); // start fiber
        });
        myWidgets.rotateXY.addEventListener( "mousedown", function( event ) {
            myWidgets.rotateXY.drag = initDrag(event);
            updateCameraCoordinatesFiber(); // start fiber
        });
        
        gc.addEventListener( document, "mouseup", function( event ) {
            stopDrag();
        });
        gc.addEventListener( document, "mouseleave", function( event ) {
            stopDrag();
        });
        
        gc.addEventListener( document, "mousemove", function( event ) {
            if( myWidgets.xy.drag ) {
                myWidgets.xy.drag.current.x = event.clientX;
                myWidgets.xy.drag.current.y = event.clientY;
            }
            if( myWidgets.z.drag ) {
                myWidgets.z.drag.current.x = event.clientX;
                myWidgets.z.drag.current.y = event.clientY;
            }
            if( myWidgets.rotateXY.drag ) {
                myWidgets.rotateXY.drag.current.x = event.clientX;
                myWidgets.rotateXY.drag.current.y = event.clientY;
            }
        });
        
        var updateCameraCoordinatesFiber = function(){
            var diff = { x:0, y:0, z:0, rotateX:0, rotateY:0, rotateZ:0 };
            diff.order = cameraCoordinates.order.input.value;
            var isDragging = false;
            if( myWidgets.xy.drag ) {
                diff.x = myWidgets.xy.drag.current.x - myWidgets.xy.drag.start.x;
                diff.y = myWidgets.xy.drag.current.y - myWidgets.xy.drag.start.y;
                isDragging = true;
            }
            if( myWidgets.z.drag ) {
                diff.z = myWidgets.z.drag.current.y - myWidgets.z.drag.start.y;
                diff.rotateZ = myWidgets.z.drag.current.x - myWidgets.z.drag.start.x;
                isDragging = true;
            }
            if( myWidgets.rotateXY.drag ) {
                diff.rotateX = myWidgets.rotateXY.drag.current.y - myWidgets.rotateXY.drag.start.y;
                diff.rotateY = myWidgets.rotateXY.drag.current.x - myWidgets.rotateXY.drag.start.x;
                isDragging = true;
            }

            if( isDragging ) {
                diff = snapToGrid(diff);
                diff = coordinateTransformation(diff);
                var moveTo = {};
                var scale = util.toNumber(cameraCoordinates.scale.input.value, 1);
                moveTo.x = Number(cameraCoordinates.x.input.value) + diff.x * scale;
                moveTo.y = Number(cameraCoordinates.y.input.value) + diff.y * scale;
                moveTo.z = Number(cameraCoordinates.z.input.value) + diff.z * scale;
                moveTo.scale = scale + util.toNumber(diff.scale);
                moveTo.rotateX = Number(cameraCoordinates.rotateX.input.value) - diff.rotateX/10;
                moveTo.rotateY = Number(cameraCoordinates.rotateY.input.value) + diff.rotateY/10;
                moveTo.rotateZ = Number(cameraCoordinates.rotateZ.input.value) - diff.rotateZ/10;
                moveTo.order = diff.order; // Order is not a diff, just set the new value
                moveTo = round(moveTo);
                util.triggerEvent(toolbar, "impressionist:camera:setCoordinates", moveTo );
                setTimeout( updateCameraCoordinatesFiber, 100 );
            }
        };
        
        // Ignore small values in diff values.
        // For example, if the movement is 88 degrees in some direction, this should correct it to 
        // 90 degrees. Helper for updateCameraCoordinatesFiber().
        var snapToGrid = function(diff) {
            // To start, simply ignore any values < 5 pixels.
            // This creates 
            // - a 10x10 px square whithin which there won't be any movement
            // - outside of that, 10 px corridoors in each 90 degree direction, 
            //   within which small deviations from 90 degree angles are ignored.
            for( var k in diff ) {
                if ( k == "order" ) continue;
                diff[k] = Math.abs(diff[k]) > 5 ? diff[k] : 0;
            }
            // For the z and o widgets, attach to full 90 degrees in the closest direction.
            // This means you can only zoom or rotate in one direction, not both at the same time.
            // Once a direction is chosen, lock that until dragStop() event.
            if( myWidgets.z.drag && myWidgets.z.drag.setzero ) {
                diff[myWidgets.z.drag.setzero] = 0;
            }
            else {
                if( Math.abs(diff.z) > Math.abs(diff.rotateZ) ) {
                    diff.rotateZ = 0;
                    myWidgets.z.drag.setzero = "rotateZ";
                }
                else if ( Math.abs(diff.z) < Math.abs(diff.rotateZ) ) {
                    diff.z = 0;
                    myWidgets.z.drag.setzero = "z";
                }
            }
            if( myWidgets.rotateXY.drag && myWidgets.rotateXY.drag.setzero ) {
                diff[myWidgets.rotateXY.drag.setzero] = 0;
            }
            else {
                if( Math.abs(diff.rotateX) > Math.abs(diff.rotateY) ) {
                    diff.rotateY = 0;
                    myWidgets.rotateXY.drag.setzero = "rotateY";
                }
                else if ( Math.abs(diff.rotateX) < Math.abs(diff.rotateY) ) {
                    diff.rotateX = 0;
                    myWidgets.rotateXY.drag.setzero = "rotateX";
                }
            }
            return diff;
        };
    };
    
    // Reset rotationAxisLock when entering a new step, or when order field was manually edited
    var resetRotationAxisLock = function () {
        rotationAxisLock = {x:false, y:false, z:false};
    };
    
    // Reset rotationAxisLock whenever entering a new step
    gc.addEventListener(document, "impress:stepenter", function (event) {
        resetRotationAxisLock();
    });
    
    // Wait for camera plugin to initialize first
    
    gc.addEventListener(document, "impressionist:camera:init", function (event) {
        cameraCoordinates = event.detail.widgets;
        // Reset rotationAxisLock if the order field was manually edited
        cameraCoordinates.order.input.addEventListener("input", function (event) {
            resetRotationAxisLock();
        });
        cameraCoordinates.order.plus.addEventListener("click", function (event) {
            resetRotationAxisLock();
        });
        cameraCoordinates.order.minus.addEventListener("click", function (event) {
            resetRotationAxisLock();
        });

        toolbar = document.getElementById("impressionist-toolbar");
        addCameraControls();
    }, false);

    // 3d coordinate transformations
    //
    // Without this, the controls work, but they will just modify the camera
    // coordinates directly. If the camera was rotated, this no longer makes
    // sense. For example, setting rotate: z: to 180, would turn everything
    // upside down. Now, if you pull the "+" (xy) control up, you will
    // actually see the camera panning down.
    //
    // We want the controls to move the camera relative to the current viewport/camera position,
    // not the origin of the xyz coordinates. These functions modify the diff object so that
    // the movements are according to current viewport.
    //
    // For the x/y/z translations, we simply modify the diff vector to account for all the possible
    // rotations that might be in place. 
    //
    // Based on http://www.math.tau.ac.il/~dcor/Graphics/cg-slides/geom3d.pdf 
    // and https://24ways.org/2010/intro-to-css-3d-transforms/
    //
    // For adjusting rotations, a different strategy is needed.
    // It turns out that for rotations order matters, and whatever is the first rotation, will
    // just work without modification. For the following ones, we could try some sin()*cos()
    // multiplication magic, but in some edge cases (in particular, rotateY(90) with the default
    // order=xyz) two axes can collapse into one, so we lose a dimension and no amount of sin()*cos()
    // is able to do anything about that. So instead with rotations the strategy is just to move
    // the axis currently being rotated to be last. This is trivial if the current rotation around
    // that axis is 0. If it is non-zero, we can not do anything, but leave the order as it is
    // and just rotate anyway. This can often look odd to the user. Sorry.
    var coordinateTransformation = function(diff){
        var deg = function(rad) {
          return rad * (180 / Math.PI);
        };

        var rad = function(deg) {
          return deg * (Math.PI / 180);
        };
        
        var newDiff = {};

        var xyz = diff.order; // Note: This is the old value, not a diff. The only place to change it is this method.
        
        var angle = {
            x: util.toNumber(cameraCoordinates.rotateX.input.value),
            y: util.toNumber(cameraCoordinates.rotateY.input.value),
            z: util.toNumber(cameraCoordinates.rotateZ.input.value)
        };

        var computeRotate = {
            x: function(angle, v){
                var vv = [];
                vv[0] = v[0];
                vv[1] = v[1] * Math.cos( rad(angle) ) - v[2] * Math.sin( rad(angle) );
                vv[2] = v[2] * Math.cos( rad(angle) ) + v[1] * Math.sin( rad(angle) );
                return vv;
            },
            y: function(angle, v){
                var vv = [];
                vv[0] = v[0] * Math.cos( rad(angle) ) + v[2] * Math.sin( rad(angle) );
                vv[1] = v[1];
                vv[2] = v[2] * Math.cos( rad(angle) ) - v[0] * Math.sin( rad(angle) );
                return vv;
            },
            z: function(angle, v){
                var vv = [];
                vv[0] = v[0] * Math.cos( rad(angle) ) - v[1] * Math.sin( rad(angle) );
                vv[1] = v[1] * Math.cos( rad(angle) ) + v[0] * Math.sin( rad(angle) );
                vv[2] = v[2];
                return vv;
            }
        };

        // Transform the [x, y, z] translation vector moving the camera to account for the current rotations.
        // Note that for the camera. aka the canvas, impress.js applies the rotation in the reverse order
        var v = [ diff.x, diff.y, diff.z ];
        for ( var i = xyz.length-1; i >= 0; i-- ) {
            v = computeRotate[xyz[i]](angle[xyz[i]], v);
        }
        newDiff.x = v[0];
        newDiff.y = v[1];
        newDiff.z = v[2];

        // Rotations
        // Capture current rotations from cameraCoordinates
        var currentRotations = {};
        for ( var i = 0; i < xyz.length; i++ ) {
            // iterate over rotateX/Y/Z in the order they appear in "order"
            var rotateStr = "rotate" + xyz[i].toUpperCase();
            currentRotations[xyz[i]] = util.toNumber( cameraCoordinates[rotateStr].input.value );
        }

        // Controls only allow 1 axis at a time to be rotating. Find out which one, if any.
        var axis = "";
        if ( diff.rotateX ) axis = "x";
        if ( diff.rotateY ) axis = "y";
        if ( diff.rotateZ ) axis = "z";

        // See if we can move that axis last in the order field
        if ( Math.abs( currentRotations[axis] ) < 1 && !rotationAxisLock[axis] ) {
            // Move that axis last in the order
            newDiff.order = diff.order.split(axis).join("") + axis;
        }
        // However, we only ever move the axis once. Changing the axis (direction) of rotation
        // once it has started is confusing to the user. So now that we're moving along this axis,
        // it cannot be moved in the order anymore.
        rotationAxisLock[axis] = true;

        newDiff.rotateX = diff.rotateX;
        newDiff.rotateY = diff.rotateY;
        newDiff.rotateZ = diff.rotateZ;
        newDiff.scale = diff.scale;
        return newDiff;
    };



    
})(document, window);


/**
 * Electron IPC
 *
 * This is the renderer side of some Electron IPC calls.
 *
 * Copyright 2016 Henrik Ingo (@henrikingo)
 * Released under the MIT license.
 */
(function ( document, window ) {
    'use strict';

    // Return the entire document when requested
    if( window.require ){
        var getDocumentElement = function (event, filename) {
            // Remove DOM elements added by impressionist itself (toolbars, tinymce)
            impressionist().gc.removeAll();
            impress().tear();
            trimLastChild();

            ipc.send('impressionist-return-documentElement', {
                filename: filename,
                documentElement: document.documentElement.outerHTML
            });

            // Aaannd then we reload impress and put the impressionist bits right back to where they were
            impress().init();
            var script = impressionist().util.loadJavaScript(
                process.resourcesPath + "/../../../../js/impressionist.js", function(){
                    impressionist().gc.pushElement(script); // The circle of life :-)
                    impressionist().util.triggerEvent(document, "impressionist:init", {}) 
                });
        };
        var ipc = require('electron').ipcRenderer;
        // Each call to getDocumentElement will end with re-adding impressionist.js script element
        // Thus causing a fresh copy of getDocumentElement itself to be registered as listener
        ipc.once('impressionist-get-documentElement', getDocumentElement);
    }

    /**
    * Trim Newlines from the lastChild of body
    *
    * For reasons I don't know, Google Chrome, and therefore Electron as well, adds 1-2 newlines
    * to the end of the body of any html page it opens. You can see this by simply typing in the
    * javascript console of a simple test page:
    *
    *      document.documentElement.innerHTML.toString()
    *
    * or
    *
    *      document.body.lastChild.nodeValue
    *
    * This is a bit annoying if we're gonna open and save a html document in Electron. For each time
    * we'd open and save a particular file, it would add newlines to the end of itself, causing the
    * file to grow indefinitively.
    *
    * To avoid this, we trim extra newlines from the end of the file.
    */
    var trimLastChild = function() {
        while ( true ) {
            var end = document.body.lastChild;
            if (end.nodeType != 3) break;
            end = end.nodeValue;
            if ( end.slice(-3) != "\n\n\n" ) break;
            // Trim one newline from the end
            document.body.lastChild.nodeValue = end.slice(0,-1);
        }
    };

})(document, window);

/**
 * Load impressionist.css
 *
 * Copyright 2016 Henrik Ingo (@henrikingo)
 * Released under the MIT license.
 */
(function ( document, window ) {
    'use strict';
    // Just load it ASAP. No need to wait for impressionist:init
    var link = impressionist().util.loadCss(process.resourcesPath + "/../../../../css/impressionist.css");
    impressionist().gc.pushElement(link);

})(document, window);

/**
 * Tinymce integration
 *
 * Initialize tinyMCE editor after impressionist:init. Note that tinyMCE itself is in node_modules.
 *
 * Copyright 2016 Henrik Ingo (@henrikingo)
 * Released under the MIT license.
 */
(function ( document, window ) {
    'use strict';
    var toolbar;
    var script;
    var gc = impressionist().gc;

    var tinymceOnInitDone = false;

    var tinymceOnInit = function() {
        if ( !tinymceOnInitDone ) {
            tinymceOnInitDone = true;
            // TODO: This is now done as the first editor instance completed init.
            // Someone might expect that we would only trigger this event once all editors did init.
            // That would be complex, and nobody needs that now, so I didn't do that.
            impressionist().util.triggerEvent( document, "impressionist:tinymce:init", { script : script, toolbar : toolbar } );
        }
    };

    var tinymceInit = function() {
        window.tinymce.init({
            setup: function(ed) { ed.on('init', tinymceOnInit); },
            inline: true,
            selector: '.step',
            theme: 'modern',
            width: 780,
            height: 550,
            menubar: false,
            statusbar: false,
            fixed_toolbar_container: '#tinymce-toolbar',
            toolbar: 'styleselect fontselect fontsizeselect forecolor | ' +
                     'cut copy paste | undo redo | ' +
                     'bold italic underline strikethrough | ' +
                     'alignleft aligncenter alignright alignjustify | ' +
                     'bullist numlist outdent indent | ' +
                     'link image table code',
            fontsize_formats: '8pt 12pt 16pt 20pt 24pt 30pt 36pt 48pt 72pt 96pt',
            plugins: [
            'advlist autolink link image lists charmap print preview hr anchor pagebreak spellchecker',
            'searchreplace wordcount visualblocks visualchars code fullscreen insertdatetime media nonbreaking',
            'save table contextmenu directionality emoticons template paste textcolor'
            ]
        });
    };


    gc.addEventListener(document, "impressionist:init", function (event) {
        var html = '<div id="tinymce-toolbar"></div>';
        toolbar = impressionist().util.makeDomElement(html);
        gc.appendChild(document.body, toolbar);
        script = impressionist().util.loadJavaScript(process.resourcesPath + "/../../../tinymce/tinymce.js", tinymceInit);
        impressionist().gc.pushElement(script);
    });

})(document, window);

/**
 * Impressionist toolbar
 *
 * Copyright 2016 Henrik Ingo (@henrikingo)
 * Released under the MIT license.
 */
(function ( document, window ) {
    'use strict';
    // Add the impressionist toolbar to the document.
    // Note, this is the opposite of the impress.js toolbar: We don't look for a div in the document,
    // we add this toolbar without asking permission. Assumption is that since you're using impressionist, you want this.
    var toolbar = document.createElement("DIV");
    toolbar.id = "impressionist-toolbar";
    // If groups are given titles, they are rendered as tabs, with the title as the tab name.
    var groupTitles = [];
    var groupTitlesDiv = document.createElement("DIV");
    groupTitlesDiv.id = "impressionist-toolbar-titles";
    toolbar.appendChild(groupTitlesDiv);
    // Toolbar widgets that belong together, are added to a group in the toolbar. Groups are rendered in index order.
    var groups = [];
    var groupDiv = document.createElement("DIV");
    groupDiv.id = "impressionist-toolbar-groups";
    toolbar.appendChild(groupDiv);
    var gc = impressionist().gc;

    /**
     * Get the span element that is a child of toolbar, identified by index.
     *
     * If span element doesn't exist yet, it is created.
     *
     * Note: Because of Run-to-completion, this is not a race condition.
     * https://developer.mozilla.org/en/docs/Web/JavaScript/EventLoop#Run-to-completion
     *
     * :param: index   Method will return the element <span id="impress-toolbar-group-{index}">
     */
    var getGroupElement = function(index){
        var id = "impressionist-toolbar-group-" + index;
        if(!groups[index]){
            groups[index] = document.createElement("span");
            groups[index].id = id;
            if ( groupTitles.length > 0 && currentTab != index ) {
                groups[index].style.display = "none";
            }
            var nextIndex = getNextGroupIndex(index);
            if ( nextIndex === undefined ){
                groupDiv.appendChild(groups[index]);
            }
            else{
                groupDiv.insertBefore(groups[index], groups[nextIndex]);
            }
        }
        return groups[index];
    };

    /**
     * Get the span element from groups[] that is immediately after given index.
     *
     * This can be used to find the reference node for an insertBefore() call.
     * If no element exists at a larger index, returns undefined. (In this case,
     * you'd use appendChild() instead.)
     *
     * Note that index needn't itself exist in groups[].
     */
    var getNextGroupIndex = function(index){
        var i = index+1;
        while( ! groups[i] && i < groups.length) {
            i++;
        }
        if( i < groups.length ){
            return i;
        }
    };

    /**
     * Event listener for the buttons that make a tab visible (generator function)
     */
    var currentTab = 0;
    var showTabGenerator = function(index){
        return function(e){
            // Hide currentTab
            if ( currentTab !== undefined ) {
                groups[currentTab].style.display = "none";
            }
            // For this tab, show it or if it was already showing, leave it hidden (toggle)
            if ( index != currentTab ) {
                groupDiv.style.display = "block";
                groups[index].style.display = "inline";
                currentTab = index;
            }
            else {
                groupDiv.style.display = "none";
                currentTab = undefined;
            }
        };
    };

    // API
    // Other plugins can add and remove buttons by sending them as events.
    // In return, toolbar plugin will trigger events when widget was added.
    /**
     * Give a name to a group.
     *
     * The name is used as the title for the tab that the group is rendered as.
     *
     * :param: e.detail.group   integer specifying which group the title is for
     * :param: e.detail.title   the title to be used for the group
     */
    toolbar.addEventListener("impressionist:toolbar:groupTitle", function( e ){
        var index = e.detail.group;
        var isNew = groupTitles[index] === undefined;
        if ( isNew ){
            // Create the corresponding tab title
            var nextIndex = getNextGroupIndex(index);
            groupTitles[index] = document.createElement("button");
            groupTitles[index].id = "impressionist-toolbar-group-" + index + "-title";
            if ( nextIndex === undefined ){
                groupTitlesDiv.appendChild(groupTitles[index]);
            }
            else{
                groupTitlesDiv.insertBefore(groupsTitles[index], groups[nextIndex]);
            }
            groupTitles[index].addEventListener("click", showTabGenerator(index));
        }
        groupTitles[index].innerHTML = e.detail.title;
    });

    /**
     * Append a widget inside toolbar span element identified by given group index.
     *
     * Note: When groupTitles are given, the toolbar groups become tabs. In this case group #0
     * is the one shown initially.
     *
     * :param: e.detail.group    integer specifying the span element where widget will be placed
     * :param: e.detail.element  a dom element to add to the toolbar
     */
    toolbar.addEventListener("impressionist:toolbar:appendChild", function( e ){
        var group = getGroupElement(e.detail.group);
        group.appendChild(e.detail.element);
    });

    /**
     * Add a widget to toolbar using insertBefore() DOM method.
     *
     * :param: e.detail.before   the reference dom element, before which new element is added
     * :param: e.detail.element  a dom element to add to the toolbar
     */
    toolbar.addEventListener("impressionist:toolbar:insertBefore", function( e ){
        toolbar.insertBefore(e.detail.element, e.detail.before);
    });

    /**
     * Remove the widget in e.detail.remove.
     */
    toolbar.addEventListener("impressionist:toolbar:removeWidget", function( e ){
        toolbar.removeChild(e.detail.remove);
    });

    /**
     * Insert the html element that is this toolbar
     *
     * Do this after adding the tinymce toolbar so that this is below tinymce when both are visible.
     */
    gc.addEventListener(document, "impressionist:tinymce:init", function (event) {
        gc.appendChild(document.body, toolbar);
        impressionist().util.triggerEvent( document, "impressionist:toolbar:init", { toolbar : toolbar } );
    });

})(document, window);

