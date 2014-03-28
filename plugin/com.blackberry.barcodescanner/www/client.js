/*
* Copyright 2013 Research In Motion Limited.
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
* http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/

(function (cordova) {
    var _ID = "com.blackberry.barcodescanner",
        exec = cordova.require("cordova/exec"),
        reading, canvas, timeout, fs, latestFrame = null,
        fsSize = 1024 * 1024,
        codefoundCallback, errorfoundCallback,
        sleepPrevented = false,
        readFile,
        errorHandler,
        frameAvailable;

    function BarcodeScanner() {
        blackberry.io.sandbox = false;
    }

	// BarcodeScanner.prototype.startRead = function (codeFound, errorFound, canvasID, successStart) {
	BarcodeScanner.prototype.startRead = function (succ, fail, args) {
		if (reading) return "Stop Scanning before scanning again";

        var canvasID  = args,
            frameAvailableFn = frameAvailable,
            success,
            failure;

		reading = true;

		success = function (data, response) {
			var arData = data.split(" "),
				receivedEvent = arData[0],
                frameData,
                codeFoundData,
                errorData;

			if (receivedEvent === "community.barcodescanner.frameavailable.native") {
				frameData = JSON.parse(arData[1]);
				frameAvailableFn(frameData);
			}
			else if (receivedEvent === "community.barcodescanner.started.native") {
				canvas = document.getElementById(canvasID);
				canvas.style.display = "block";
			}
			else if (receivedEvent === "community.barcodescanner.codefound.native") {
				codeFoundData = JSON.parse(arData[1]);
				succ(codeFoundData);
			}
			else if (receivedEvent === "community.BarcodeScanner.errorfound") {
				errorData = JSON.parse(arData[1]);
				fail(errorData);
			}
		};

		failure = function (data, response) {
			fail(data);
		};

		// Turn on prevent sleep, if it's in the app
		if (typeof community !== "undefined" && typeof community.preventsleep !== "undefined") {
			if (!community.preventsleep.isSleepPrevented) {
				community.preventsleep.setPreventSleep(true);
				sleepPrevented = true;
			}
		}
		exec(success, failure, _ID, "startRead", null);
	};

	BarcodeScanner.prototype.stopRead = function (succ, fail) {
        var success,
            failure;

        canvas.style.display = "none";
		reading = false;

		success = function (data, response) {
            var arData = data.split(" "),
                receivedEvent = arData[0],
                successData;

			if (receivedEvent === "community.barcodescanner.ended.native") {
				successData = JSON.parse(arData[1]);
				succ(successData);
			}
		};

		failure = function (data, response) {
			fail(data);
		};

		// Return sleep setting to original if changed.
		if (typeof community !== "undefined" && typeof community.preventsleep !== "undefined") {
			if (sleepPrevented === true) {
				community.preventsleep.setPreventSleep(false);
				sleepPrevented = false;
			}
		}

        exec(success, failure, _ID, "stopRead", null);
	};

    readFile = function (filename) {
        window.requestFileSystem  = window.requestFileSystem || window.webkitRequestFileSystem;

        window.requestFileSystem(
            window.TEMPORARY,
            fsSize,
            function (fs) {
                fs.root.getFile(
                    filename,
                    {create: false},
                    function (fileEntry) {
                        fileEntry.file(
                            function (file) {
                                var reader = new FileReader();
                                reader.onloadend = function (e) {
                                    var ctx = canvas.getContext("2d"),
                                    img = new Image();

                                    img.onload = function () {
                                        ctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, canvas.width, canvas.height);
                                        URL.revokeObjectURL(img.src);
                                        img.src = null;
                                    };

                                    img.src = e.target.result;
                                };

                                reader.readAsDataURL(file);
                            },
                            errorHandler
                        );
                    },
                    errorHandler
                );
            }
        );
    };

	errorHandler = function (e) {
		var msg = '';

		switch (e.code) {
        case FileError.QUOTA_EXCEEDED_ERR:
            msg = 'QUOTA_EXCEEDED_ERR';
            break;
        case FileError.NOT_FOUND_ERR:
            msg = 'NOT_FOUND_ERR';
            break;
        case FileError.SECURITY_ERR:
            msg = 'SECURITY_ERR';
            break;
        case FileError.INVALID_MODIFICATION_ERR:
            msg = 'INVALID_MODIFICATION_ERR';
            break;
        case FileError.INVALID_STATE_ERR:
            msg = 'INVALID_STATE_ERR';
            break;
        default:
            msg = 'Unknown Error';
            break;
        }
    };

    frameAvailable = function (data) {
        latestFrame = data.frame;
        timeout = setTimeout(readFile, 4, latestFrame);
    };

    cordova.addConstructor(function () {
        if (!blackberry.barcodescanner) blackberry.barcodescanner = {};
        blackberry.barcodescanner = new BarcodeScanner();
    });

})(window.cordova || window.Cordova);
