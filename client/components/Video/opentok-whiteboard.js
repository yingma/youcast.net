/*!
 *  opentok-whiteboard (http://github.com/aullman/opentok-whiteboard)
 *
 *  Shared Whiteboard that works with OpenTok
 *
 *  @Author: Adam Ullman (http://github.com/aullman)
 *  @Copyright (c) 2014 Adam Ullman
 *  @License: Released under the MIT license (http://opensource.org/licenses/MIT)
 **/

'use strict'

webrtc.directive('otWhiteboard', ['$window', '$timeout', 'EventCall', 'EventSnap', 'EventWhiteboard', 'awsApiGatewayFactory', 
    function($window, $timeout, EventCall, EventSnap, EventWhiteboard, awsApiGatewayFactory) {
        return {
            restrict: 'E',
            scope: { onExit: '&' },
            template: '<canvas hidpi="off" resize="true"></canvas>' +
                '<div ng-class="infoStyle">{{info}}</div>' +
                '<div class="OT_panel">' +
                '<input type="button" ng-class="{OT_color: true, OT_selected: c[\'background-color\'] === color}" ' +
                'ng-repeat="c in colors" ng-style="c" ng-click="changeColor(c)"></input>' +
                '<input type="button" ng-class="{OT_erase: true, OT_selected: mode === \'text\'}" ng-click="toggleMode(\'text\')" value="Text"></input>' +
                '<input type="button" ng-class="{OT_erase: true, OT_selected: mode === \'line\'}" ng-click="toggleMode(\'line\')" value="Line"></input>' +
                '<input type="button" ng-class="{OT_erase: true, OT_selected: mode === \'rect\'}" ng-click="toggleMode(\'rect\')" value="Rect"></input>' +
                '<input type="button" ng-click="erase()" ng-class="{OT_erase: true, OT_selected: erasing}"' +
                ' value="Eraser"></input>' +
                '<input type="button" ng-click="capture()" class="OT_capture" value="Capture"></input>' +
                '<input type="button" ng-click="undo()" class="OT_capture" value="Undo"></input>' +
                '<input type="button" ng-click="redo()" class="OT_capture" value="Redo"></input>' +
                '<input type="button" ng-click="clear()" class="OT_clear" value="Clear"></input>' +
                '<input type="button" ng-click="exit()" class="OT_exit" value="Exit"></input></div>',

            link: function(scope, element, attrs) {

                scope.calls = [];
                // happen once
                scope.eventCall = EventCall;
                // will happen many times
                scope.eventSnap = EventSnap;
                // upload service
                scope.eventWhiteboard = EventWhiteboard;

                scope.mode = "pen";

                scope.infoStyle = "OT_info_off";

                var canvas = element[0].querySelector("canvas"),
                    infoDiv = element[0].querySelector("div"),
                    select = element[0].querySelector("select"),
                    input = element[0].querySelector("input"),
                    client = { dragging: false },

                    count = 0, //Grabs the total count of each continuous stroke
                    undoStack = [], //Stores the value of start and count for each continuous stroke
                    redoStack = [], //When undo pops, data is sent to redoStack
                    pathStack = [],
                    drawHistory = [],
                    // drawHistoryReceivedFrom,
                    // drawHistoryReceived,
                    //batchUpdates = [],
                    resizeTimeout,
                    iOS = /(iPad|iPhone|iPod)/g.test(navigator.userAgent);

                // Create an empty project and a view for the canvas

                paper.setup(canvas);

                window.addEventListener('resize', resizeCanvas, false);

                function resizeCanvas() {
                    var aspect = scope.imageWidth / scope.imageHeight;
                    var ratio = window.innerWidth / window.innerHeight;

                    if (aspect < ratio) {
                        paper.view.viewSize.height = scope.imageHeight;
                        paper.view.viewSize.width = scope.imageHeight * ratio;
                    } else {
                        paper.view.viewSize.width = scope.imageWidth;
                        paper.view.viewSize.height = scope.imageWidth / ratio;
                    }                    
                };                            

                var clearCanvas = function() {
                    drawLayer.removeChildren();
                    paper.view.update();
                    drawHistory = [];
                    pathStack = [];
                    undoStack = [];
                    redoStack = [];
                    count = 0;

                };

                scope.init = function()  {
                    paper.project.clear();
                    clearCanvas();
                };

                scope.setupCall = function(newcall, flag) {
                    if (!angular.isDefined(newcall)) {
                        return;
                    }
                    if (flag) {
                        if (!scope.calls.includes(newcall)) {
                            scope.calls.push(newcall);
                            newcall.ondatareceive = onDataReceive_.bind(this);
                        }
                        if (newcall.needResendData()) {
                            drawHistory.forEach(function(update) {
                                var json = {
                                    type: "otWhiteboard_update",
                                    data: update
                                };
                                newcall.sendRelayTextData(JSON.stringify(json));                                                                                       
                            });
                            newcall.setToResendData(false);
                        }
                    } else {
                        if (scope.calls.includes(newcall)) {
                            var i = scope.calls.indexOf(newcall);
                            if (i >= 0) {
                                scope.calls.splice(i, 1);
                            }
                        }
                    }
                };

                scope.setupImage = function(newimage, width, height) {
                    paper.project.clear();
                    clearCanvas();
                    var backgroundLayer = new paper.Layer();
                    var raster = new paper.Raster(newimage);

                    scope.imageWidth = width;
                    scope.imageHeight = height;

                    var aspect = width/height;
                    var ratio = window.innerWidth / window.innerHeight;//canvas.width / canvas.height;

                    if (aspect < ratio) {
                        paper.view.viewSize.height = height;
                        paper.view.viewSize.width = height * ratio;
                    } else {
                        paper.view.viewSize.width = width;
                        paper.view.viewSize.height = width / ratio;
                    }

                    //var scale = Math.min(canvas.width / width, canvas.height / height);
                    
                    //raster.scale(scale);

                    // scope.lastScale = scale;

                    //raster.position = paper.view.center;
                    raster.position.x += width / 2;
                    raster.position.y += height / 2;

                    drawLayer = new paper.Layer();
                    //drawLayer.position = paper.view.center;
                    drawLayer.activate();

                    scope.$emit('otWhiteboardUpdate');
                };

                var drawLayer = new paper.Layer();
                drawLayer.position = paper.view.center;
                drawLayer.activate();

                // Set canvas size
                canvas.width = attrs.width || element.width();
                canvas.height = attrs.height || element.height();

                // Set paper.js view size
                paper.view.viewSize = new paper.Size(canvas.width, canvas.height);
                paper.view.position = paper.view.center;
                paper.view.draw();

                scope.eventCall.subscribe(scope.setupCall);
                scope.eventSnap.subscribe(scope.setupImage);
                scope.eventWhiteboard.subscribe(scope.init);

                scope.colors = [
                    { 'background-color': 'blue' },
                    { 'background-color': 'red' },
                    { 'background-color': 'green' },
                //    { 'background-color': 'white' }
                ];

                //scope.captureText = iOS ? 'Email' : 'Capture';

                scope.strokeCap = 'round';
                scope.strokeJoin = 'round';
                scope.lineWidth = 5;

                scope.changeColor = function(color) {
                    scope.color = color['background-color'];
                    scope.erasing = false;
                };

                //change 
                scope.changeColor(scope.colors[Math.floor(Math.random() * scope.colors.length)]);

                //clear
                scope.clear = function() {
                    clearCanvas();
                    sendUpdate('otWhiteboard_clear', null);
                };

                // erase
                scope.erase = function() {
                    scope.erasing = true;
                    scope.color = '';
                    scope.mode = 'pen';
                };

                var eraseWhiteBoard = function(point) {
                    //scope.erasing = true;
                    var closestPath, minDistance = 20,
                        distance;
                    pathStack.forEach(function(path) {
                        if (!path.visible)
                            return;
                        if (path.className === 'PointText') {
                            if (path.contains(point)) {
                                closestPath = path;
                                minDistance = 0;
                            }
                            return;             
                        }
                        distance = pathdistance(path, point);
                        if (distance < minDistance) {
                            minDistance = distance;
                            closestPath = path;
                        }
                    });
                    if (closestPath) {
                        closestPath.visible = false;
                        undoStack.push(closestPath.uuid);
                        drawHistory.forEach(function(update) {
                            if (update.uuid === closestPath.uuid) {
                                update.visible = false;
                            }
                        });
                        /// send to other side
                        sendUpdate('otWhiteboard_erase', closestPath.uuid);
                    }
                };

                var eraseWhiteBoard1 = function(uuid) {
                    undoStack.push(uuid);
                    pathStack.forEach(function(path) {
                        if (path.uuid === uuid) {
                            path.visible = false;
                            return;
                        }
                    });

                    drawHistory.forEach(function(update) {
                        if (update.uuid === uuid) {
                            update.visible = false;
                        }
                    });
                };

                scope.toggleMode = function(mode) {
                    if (scope.mode === 'text' && mode === 'text') {                                      
                        scope.mode = 'pen';
                        removeTextarea();
                        return;
                    } else if (scope.mode === 'line' && mode === 'line') {
                        scope.mode = 'pen';
                        return;
                    } else if (scope.mode === 'rect' && mode === 'rect') {
                        scope.mode = 'pen';
                        return;
                    }
                    scope.mode = mode;
                    if (scope.mode === 'text') {
                        createTextArea();
                    }
                    scope.erasing = false;
                };

                function pathdistance(path, point) {
                    var pathLength = path.length,
                        precision = 6,
                        best,
                        bestLength,
                        bestDistance = Infinity;

                    if (pathLength == 0)
                        return;

                    // linear scan for coarse approximation
                    for (var scan, scanLength = 0, scanDistance; scanLength <= pathLength; scanLength += precision) {
                        if ((scanDistance = distance2(scan = path.getPointAt(scanLength))) < bestDistance) {
                            best = scan, bestLength = scanLength, bestDistance = scanDistance;
                        }
                    }

                    // binary search for precise estimate
                    precision /= 2;
                    while (precision > 0.5) {
                        var before,
                            after,
                            beforeLength,
                            afterLength,
                            beforeDistance,
                            afterDistance;
                        if ((beforeLength = bestLength - precision) >= 0 && (beforeDistance = distance2(before = path.getPointAt(beforeLength))) < bestDistance) {
                            best = before, bestLength = beforeLength, bestDistance = beforeDistance;
                        } else if ((afterLength = bestLength + precision) <= pathLength && (afterDistance = distance2(after = path.getPointAt(afterLength))) < bestDistance) {
                            best = after, bestLength = afterLength, bestDistance = afterDistance;
                        } else {
                            precision /= 2;
                        }
                    }

                    best = [best.x, best.y];
                    best.distance = Math.sqrt(bestDistance);
                    return best.distance;

                    function distance2(p) {
                        var dx = p.x - point.x,
                            dy = p.y - point.y;
                        return dx * dx + dy * dy;
                    }
                };

                function showText(text) {
                    $timeout(function(){
                        if (text) {
                            scope.info = text;
                            scope.infoStyle = "OT_info_on";
                        } else {
                            scope.infoStyle = "OT_info_off";
                        }
                    });
                };

                function crop(canvas, width, height) {
                    var ctx = canvas.getContext("2d");
                    var img = ctx.getImageData(0, 0, width, height);

                    var c = document.createElement('canvas');
                    c.height = height;
                    c.width = width;
                    var ctx1 = c.getContext('2d');

                    ctx1.putImageData(img, 0, 0);
                    // var base64String = c.toDataURL('image/png');
                    // return base64String;
                    return c;
               
                };


                function resample(canvas, size) {
                    var width_source = canvas.width;
                    var height_source = canvas.height;
                    var width = size;
                    var height = size;

                    if (width_source > height_source) {
                        height = Math.round(size *  height_source / width_source);
                    } else {
                        width = Math.round(size * width_source / height_source);
                    }

                    var ratio_w = width_source / width;
                    var ratio_h = height_source / height;
                    var ratio_w_half = Math.ceil(ratio_w / 2);
                    var ratio_h_half = Math.ceil(ratio_h / 2);

                    var ctx = canvas.getContext("2d");
                    var img = ctx.getImageData(0, 0, width_source, height_source);
                    var img2 = ctx.createImageData(width, height);
                    var data = img.data;
                    var data2 = img2.data;

                    for (var j = 0; j < height; j++) {
                        for (var i = 0; i < width; i++) {
                            var x2 = (i + j * width) * 4;
                            var weight = 0;
                            var weights = 0;
                            var weights_alpha = 0;
                            var gx_r = 0;
                            var gx_g = 0;
                            var gx_b = 0;
                            var gx_a = 0;
                            var center_y = (j + 0.5) * ratio_h;
                            var yy_start = Math.floor(j * ratio_h);
                            var yy_stop = Math.ceil((j + 1) * ratio_h);
                            for (var yy = yy_start; yy < yy_stop; yy++) {
                                var dy = Math.abs(center_y - (yy + 0.5)) / ratio_h_half;
                                var center_x = (i + 0.5) * ratio_w;
                                var w0 = dy * dy; //pre-calc part of w
                                var xx_start = Math.floor(i * ratio_w);
                                var xx_stop = Math.ceil((i + 1) * ratio_w);
                                for (var xx = xx_start; xx < xx_stop; xx++) {
                                    var dx = Math.abs(center_x - (xx + 0.5)) / ratio_w_half;
                                    var w = Math.sqrt(w0 + dx * dx);
                                    if (w >= 1) {
                                        //pixel too far
                                        continue;
                                    }
                                    //hermite filter
                                    weight = 2 * w * w * w - 3 * w * w + 1;
                                    var pos_x = 4 * (xx + yy * width_source);
                                    //alpha
                                    gx_a += weight * data[pos_x + 3];
                                    weights_alpha += weight;
                                    //colors
                                    if (data[pos_x + 3] < 255)
                                        weight = weight * data[pos_x + 3] / 250;
                                    gx_r += weight * data[pos_x];
                                    gx_g += weight * data[pos_x + 1];
                                    gx_b += weight * data[pos_x + 2];
                                    weights += weight;
                                }
                            }
                            data2[x2] = gx_r / weights;
                            data2[x2 + 1] = gx_g / weights;
                            data2[x2 + 2] = gx_b / weights;
                            data2[x2 + 3] = gx_a / weights_alpha;
                        }
                    }
                    var c = document.createElement('canvas');
                    c.height = height;
                    c.width = width;
                    var ctx = c.getContext('2d');

                    ctx.putImageData(img2, 0, 0);
                    var base64String = c.toDataURL('image/png');
                    return base64String;
                };

                // capture
                scope.capture = function(toUpload = true) {

                    var cropCanvas = crop(canvas, paper.view.viewSize.width, paper.view.viewSize.height);

                    var data = resample(cropCanvas, 200);

                    if (!toUpload)
                        return;

                    showText("Uploading...");

                    awsApiGatewayFactory.addFile(attrs.room, attrs.user, data, cropCanvas.width, cropCanvas.height, function(err, result){
                        if(err) {
                            alert(err.message);
                            trace("error:" + error);
                            showText(null);
                            return;
                        }

                        if (result.errorType) {
                            // wrong number here
                            alert(result.errorMessage);
                            trace("error:" + result.errorMessage);
                            showText(null);
                            return;
                        }

                        // disable the button 
                        cropCanvas.toBlob(function(blob){

                            awsApiGatewayFactory.uploadFile(result.data, blob, function(status, result) {
                                if (err) {
                                    showText(null);
                                }
                                showText(null);
                                sendUpdate('otWhiteboard_capture', null);
                            });

                            // scope.eventUpload.uploadImage(file, data);

                            // $rootScope.snapshots.push({'key' :file, 'data' :data});
                            // $rootScope.$apply();

                        }, 'image/jpeg', 0.95);
                    });
                };

                // undo
                scope.undo = function() {
                    if (!undoStack.length)
                        return;
                    var uuid = undoStack.pop();
                    undoWhiteBoard(uuid);

                    ///send to other side
                    sendUpdate('otWhiteboard_undo', uuid);
                };

                var undoWhiteBoard = function(uuid) {
                    var lastUpdate;
                    redoStack.push(uuid);
                    for (var i = drawHistory.length - 1; i >= 0; i--) {
                        let update = drawHistory[i];
                        if (update.uuid === uuid) {
                            if (update.event === 'text') {
                                if (update.uuid === update.uuid1) {
                                    update.visible = !update.visible; //false;
                                } else {
                                    uuid = update.uuid1;
                                }
                                lastUpdate = update;
                            } else {
                                update.visible = !update.visible; //false;
                            }
                            break;
                        }
                    }

                    for (var i = pathStack.length - 1; i >= 0; i--) {
                        let path = pathStack[i];
                        if (path.uuid === uuid) {
                            if (path.className === 'Path') {
                                path.visible = !path.visible;
                                paper.view.update();
                            } else {
                                if (lastUpdate.uuid === lastUpdate.uuid1) {
                                    path.visible = !path.visible;                                    
                                } else {
                                    path.position.x += lastUpdate.fromX - lastUpdate.toX;
                                    path.position.y += lastUpdate.fromY - lastUpdate.toY;
                                }
                            } 
                            break;   
                        }                     
                    }                    
                };

                // redo
                scope.redo = function() {
                    if (!redoStack.length)
                        return;
                    var uuid = redoStack.pop();
                    redoWhiteBoard(uuid);

                    /// send to other side
                    sendUpdate('otWhiteboard_redo', uuid);
                };


                var redoWhiteBoard = function(uuid) {
                    var lastUpdate;
                    undoStack.push(uuid);

                    for (var i = drawHistory.length - 1; i >= 0; i--) {
                        let update = drawHistory[i];
                        if (update.uuid === uuid) {
                            if (update.event === 'text') {
                                if (update.uuid === update.uuid1) {
                                    update.visible = !update.visible; //false;
                                } else {
                                    uuid = update.uuid1;
                                }
                                lastUpdate = update;
                            } else {
                                update.visible = !update.visible; //false;
                            }
                            break;
                        }
                    }

                    for (var i = pathStack.length - 1; i >= 0; i--) {
                        let path = pathStack[i];
                        if (path.uuid === uuid) {
                            if (path.className === 'Path') {
                                path.visible = !path.visible;
                                paper.view.update();
                            } else {
                                if (lastUpdate.uuid === lastUpdate.uuid1) {
                                    path.visible = !path.visible;                                    
                                } else {
                                    path.position.x += lastUpdate.toX - lastUpdate.fromX;
                                    path.position.y += lastUpdate.toY - lastUpdate.fromY;
                                }
                            } 
                            break;   
                        }                     
                    }  

                    // for (var i = pathStack.length - 1; i >= 0; i--) {
                    //     let path = pathStack[i];
                    //     if (path.uuid === uuid) {
                    //         foundPath = path;
                    //         if (path.className === 'Path') {
                    //             path.visible = !path.visible;
                    //             paper.view.update();
                    //         } 
                    //         break;
                    //     }                                               
                    // }
                    // for (var i = drawHistory.length - 1; i >= 0; i--) {
                    //     let update = drawHistory[i];
                    //     if (update.uuid === uuid) {
                    //         if (foundPath != null && foundPath.className === 'Path') {
                    //             update.visible = !update.visible; //false;
                    //         } else if (foundPath != null && foundPath.className === 'PointText') {  
                    //             foundPath.position.x += update.toX - update.fromX;
                    //             foundPath.position.y += update.toY - update.fromY;                                                                                    
                    //         }
                    //         break;
                    //     }
                    // }
                };

                //clear
                scope.exit = function() {
                    scope.onExit();
                };

                // draw
                var draw = function(update) {
                    drawHistory.push(update);
                    switch (update.event) {
                        case 'start':
                            var path = new paper.Path();
                            path.selected = false;
                            path.strokeColor = update.color;
                            path.strokeWidth = scope.lineWidth;
                            path.strokeCap = scope.strokeCap;
                            path.strokeJoin = scope.strokeJoin;
                            path.uuid = update.uuid;

                            if (angular.isDefined(update.visible)) {
                                path.visible = update.visible;
                            }

                            var start = new paper.Point(update.fromX, update.fromY);
                            path.moveTo(start);
                            paper.view.draw();

                            pathStack.push(path);
                            break;
                        case 'drag':
                            pathStack.forEach(function(path) {
                                if (path.uuid === update.uuid) {
                                    if (update.mode === "line") {
                                        while (path.length > 0) {
                                            path.removeSegment(1);
                                        }
                                        path.add(update.toX, update.toY);
                                    } else if (update.mode === "rect") {
                                        var start = path.firstSegment.point;
                                        while (path.length > 0) {
                                            path.removeSegment(1);
                                        }                                       
                                        path.add(update.toX, start.y);
                                        path.add(update.toX, update.toY);
                                        path.add(start.x, update.toY);
                                        path.add(start.x, start.y);
                                    } else {
                                        path.add(update.toX, update.toY)
                                    }
                                    paper.view.draw();
                                }
                            });
                            break;
                        case 'end':
                            pathStack.forEach(function(path) {
                                if (path.uuid === update.uuid && path.className === 'Path') {
                                    undoStack.push(path.uuid);
                                    if (update.mode === 'pen') {
                                        path.simplify();
                                    }
                                    paper.view.draw();
                                }
                            });
                            break;
                        case 'text':
                            // if the text exists, just move it 
                            for (let text of pathStack) {
                                if (update.uuid1 && text.uuid1 === update.uuid1) {
                                    text.position.x += update.toX - update.fromX;
                                    text.position.y += update.toY - update.fromY;                          
                                    paper.view.draw();
                                    undoStack.push(update.uuid);
                                    return;
                                }
                            }

                            var text = new paper.PointText(new paper.Point(update.toX, update.toY));
                            text.uuid = update.uuid; 
                            // reference uuid 
                            text.uuid1 = update.uuid; 
                            text.content = update.text;
                            text.fillColor = update.color;
                            text.fontSize = '16px';
                            pathStack.push(text);
                            undoStack.push(update.uuid);
                            paper.view.draw();
                            break;
                    }
                };

                var drawUpdates = function(update) {
                    draw(update);
                };

                var sendUpdate = function(type, data) {
                    if (scope.calls.length > 0) {
                        var json = {
                            type: type,
                            data: data
                        };
                        for (let call of scope.calls) {
                            call.sendRelayTextData(JSON.stringify(json));
                        }
                    }
                };

                function createText(point, content) {          
                    var text = new paper.PointText(point);
                    text.uuid = parseInt(point.x) + parseInt(point.y) + Math.random().toString(36).substring(2);
                    text.uuid1 = text.uuid;
                    text.content = content;                    
                    text.fillColor = scope.color;
                    text.fontSize = '16px';

                    var update = {
                        // id: OTSession.session && OTSession.session.connection &&
                        //     OTSession.session.connection.connectionId,
                        uuid: text.uuid,
                        uuid1: text.uuid,
                        toX: point.x,
                        toY: point.y,
                        text: text.content,
                        color: scope.color,
                        event: 'text'
                    };

                    pathStack.push(text);
                    undoStack.push(update.uuid);
                    drawHistory.push(update);
                    sendUpdate('otWhiteboard_update', update);

                    return text;
                };

                function createTextArea() {
                    var textarea = document.createElement('textarea');
                    document.body.appendChild(textarea);
                    // apply many styles to match text on canvas as close as possible
                    // remember that text rendering on canvas and on the textarea can be different
                    // and sometimes it is hard to make it 100% the same. But we will try...
                    textarea.placeholder = "Please enter caption...";
                    textarea.style.position = 'absolute';
                    textarea.style.top = '2px';
                    textarea.style.left = '2px';
                    textarea.style.width = '250px';
                    textarea.style.height = '50px';
                    textarea.style.background = 'none';
                    textarea.style.fontSize = '16px';        
                    textarea.style.overflow = 'hidden';
                    textarea.style.outline = 'none';
                    textarea.style.resize = 'none';
                    textarea.style.zIndex = 10;
                    // textarea.style.border = 'none';
                    // textarea.style.padding = '0px';
                    // textarea.style.margin = '0px';
                    textarea.style.color = scope.color;//pointtext.fillColor.toCSS(true);
                    textarea.focus();

                    function handleOutsideClick(e) {
                        if (e.target !== textarea) {
                            removeTextarea();
                            createText(new paper.Point(0,15), textarea.value);
                            scope.mode = 'pen';
                            scope.$apply();   
                        }
                    }
       
                    function removeTextarea() {
                        textarea.parentNode.removeChild(textarea);
                        window.removeEventListener('click', handleOutsideClick);                      
                        paper.view.draw();                       
                    }

                    textarea.addEventListener('keydown', function(e) {
                        // hide on enter
                        // but don't hide on shift + enter
                        if (e.keyCode === 13 && !e.shiftKey) {
                            removeTextarea();
                            createText(new paper.Point(0,15), textarea.value);
                            scope.mode = 'pen';
                            scope.$apply();                            
                        }
                        // on esc do not set value back to node
                        if (e.keyCode === 27) {
                            removeTextarea();
                        }

                        //textarea.style.width = '250px';
                        textarea.style.height = 'auto';
                        textarea.style.height = textarea.scrollHeight + 'px';                    
                    });

                    setTimeout(() => {
                        window.addEventListener('click', handleOutsideClick);
                    });

                }


                // var requestHistory = function() {
                //   OTSession.session.signal({
                //     type: 'otWhiteboard_request_history'
                //   });
                // };

                angular.element(document).on('keyup', function(event) {
                    if (event.ctrlKey) {
                        if (event.keyCode === 90)
                            scope.undo();
                        if (event.keyCode === 89)
                            scope.redo();
                    }
                });

                /*
                 *    The Nuts
                 *    During the process of drawing, we collect coordinates on every [mouse|touch]move event.
                 *    These events occur as fast as the browser can create them, and is computer/browser dependent
                 *
                 */

                var hitOptions = {
                    segments: true,
                    stroke: true,
                    fill: true,
                    tolerance: 5
                };

                var selectedPath, startPoint;

                angular.element(canvas).on('mousedown mousemove mouseup mouseout touchstart touchmove touchend touchcancel',
                    function(event) {
                        if ((event.type === 'mousemove' || event.type === 'touchmove' || event.type === 'mouseout') && !client.dragging) {
                            // Ignore mouse move Events if we're not dragging
                            return;
                        }
                        event.preventDefault();
                        var offset = angular.element(canvas).offset(),
                            scaleX = canvas.width / element.width(),
                            scaleY = canvas.height / element.height();

                        var offsetX = event.offsetX;
                        var offsetY = event.offsetY;

                        if (event.type === "mousedown" || event.type === "mousemove") {
                            offsetX = event.originalEvent.pageX - offset.left;
                            offsetY = event.originalEvent.pageY - offset.top;

                        } else if (event.type === "touchstart" || event.type === "touchmove") {
                            offsetX = event.originalEvent.touches[0].pageX - offset.left;    
                            offsetY = event.originalEvent.touches[0].pageY - offset.top;
                        };
                        var x = offsetX * scaleX,
                        y = offsetY * scaleY,
                        mode = scope.erasing ? 'eraser' : scope.mode,
                        update;

                        

                        // earse
                        if (mode === 'eraser') {
                            if (event.type === 'touchstart' || event.type == 'mousedown')
                                eraseWhiteBoard(new paper.Point(x, y));
                            return;
                        }

                        switch (event.type) {
                            case 'mousedown':
                            case 'touchstart':
                                if (selectedPath) {
                                    return;
                                }
                                // Start dragging                        
                                client.dragging = true;
                                client.lastX = x;
                                client.lastY = y;
                                client.uuid = parseInt(x) + parseInt(y) + Math.random().toString(36).substring(2);
                                
                                var hitResult = paper.project.hitTest(new paper.Point(x,y), hitOptions);
                                if (hitResult) {
                                    var path = hitResult.item;
                                    if (path.className === 'PointText') {
                                        selectedPath = path;
                                        startPoint = new paper.Point(path.position.x, path.position.y);                                  
                                        return;
                                    }
                                }

                                update = {
                                    // id: OTSession.session && OTSession.session.connection &&
                                    //     OTSession.session.connection.connectionId,
                                    uuid: client.uuid,
                                    fromX: client.lastX,
                                    fromY: client.lastY,
                                    mode: scope.mode,
                                    color: scope.color,
                                    event: 'start'
                                };

                                draw(update);
                                sendUpdate('otWhiteboard_update', update);
                                break;
                            case 'mousemove':
                            case 'touchmove':
                                // offsetX = event.offsetX || event.originalEvent.pageX - offset.left ||
                                //     event.originalEvent.touches[0].pageX - offset.left,
                                //     offsetY = event.offsetY || event.originalEvent.pageY - offset.top ||
                                //     event.originalEvent.touches[0].pageY - offset.top,
                                //     x = offsetX * scaleX,
                                //     y = offsetY * scaleY;
                                if (client.dragging) {                                                                                     
                                    if (selectedPath) {
                                        selectedPath.position.x += x - client.lastX;
                                        selectedPath.position.y += y - client.lastY;
                                        client.lastX = x;
                                        client.lastY = y;
                                        return;
                                    }

                                    // Build update object
                                    update = {
                                        // id: OTSession.session && OTSession.session.connection &&
                                        //     OTSession.session.connection.connectionId,
                                        uuid: client.uuid,
                                        fromX: client.lastX,
                                        fromY: client.lastY,
                                        mode: scope.mode,
                                        toX: x,
                                        toY: y,
                                        event: 'drag'
                                    };
                                    count++;
                                    redoStack = [];
                                    client.lastX = x;
                                    client.lastY = y;
                                    draw(update);
                                    sendUpdate('otWhiteboard_update', update);                                   
                                }
                                break;
                            case 'touchcancel':
                            case 'mouseup':
                            case 'touchend':
                            case 'mouseout':
                                if (selectedPath) {
                                     var update = {
                                        // id: OTSession.session && OTSession.session.connection &&
                                        //     OTSession.session.connection.connectionId,
                                        uuid: client.uuid,
                                        uuid1: selectedPath.uuid1,
                                        fromX: startPoint.x,
                                        fromY: startPoint.y,
                                        toX: selectedPath.position.x,
                                        toY: selectedPath.position.y,
                                        event: 'text'
                                    };
                                    drawHistory.push(update);
                                    undoStack.push(update.uuid);
                                    sendUpdate('otWhiteboard_update', update);
                                    selectedPath = null;
                                } else if (count) {
                                    update = {
                                        // id: OTSession.session && OTSession.session.connection &&
                                        //     OTSession.session.connection.connectionId,
                                        uuid: client.uuid,
                                        mode: scope.mode,
                                        event: 'end'
                                    };

                                    draw(update);
                                    sendUpdate('otWhiteboard_update', update);
                                }

                                client.dragging = false;
                                client.uuid = false;
                                break;
                        }
                    });

                function onDataReceive_(event) {
                    switch (event.type) {
                        case 'otWhiteboard_update':
                            drawUpdates(event.data);
                            scope.$emit('otWhiteboardUpdate');
                            break;
                        case 'otWhiteboard_undo':                  
                            undoWhiteBoard(event.data);                            
                            scope.$emit('otWhiteboardUpdate');
                            break;
                        case 'otWhiteboard_redo':
                            redoWhiteBoard(event.data);
                            scope.$emit('otWhiteboardUpdate');
                            break;
                        case 'otWhiteboard_clear':
                            clearCanvas();
                            break;
                        case 'otWhiteboard_erase':
                            eraseWhiteBoard1(event.data);
                            scope.$emit('otWhiteboardUpdate');
                            break;
                        case 'otWhiteboard_capture':
                            scope.capture(false);
                            scope.$emit('otWhiteboardUpdate');
                            break;
                    };

                };

            }
        };
    }]);
