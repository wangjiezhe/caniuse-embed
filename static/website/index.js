var generateEmbedButton = document.getElementById("generate-embed");
var featureSelect = $('select[name="featureID"]');
var embedAPI = 'https://api.caniuse.wangjiezhe.com';

/* =====================
 * Utility functions
 * =====================*/

function getCheckedBoxes(chkboxName) {
	var checkboxes = document.getElementsByName(chkboxName);
	var checkboxesChecked = [];
	// loop over them all
	for (var i=0; i<checkboxes.length; i++) {
		// And stick the checked ones onto an array...
		if (checkboxes[i].checked) {
				checkboxesChecked.push(checkboxes[i].value);
		}
	}
	// Return the array if it is non-empty, or null
	return checkboxesChecked.length > 0 ? checkboxesChecked : null;
}

/* =====================
 * Get list of available features for <select>
 * =====================*/

async function getFeatureList() {
	const url = embedAPI + '/features';
	const res = await fetch(url);
	const features = await res.json();
	const options = features.map((feature) => {
		return {label: feature.title, value: feature.id}
	});
	const choice = new Choices(featureSelect[0])
	choice.setChoices(options);
	choice.setChoiceByValue('once-event-listener');
}

/* =====================
 * Generate feature
 * =====================*/

function generatePreview(featureID, periods, accessibleColours, imageBase) {

	var textPreview = `<p>Data on support for the ${featureID} feature across the major browsers</p>`;

	var preview = textPreview;

	if (embedType === "interactive-embed") {
		preview = `<p class="ciu_embed" data-feature="${featureID}" data-periods="${periods}" data-accessible-colours="${accessibleColours}">
		${textPreview}
	</p>`;
	}

	return preview;
}

function displayExportCode(preview) {
 var exportCode = preview
									.replace(/</g, "&lt;")
									.replace(/>/g, "&gt;");
	$('#stepThree').html(exportCode);

	return preview;
}

function displayPreview(preview) {

	$('.export-preview').html(preview);
	new Clipboard(document.getElementById('copyStepThree'));

	if (embedType === "interactive-embed") {
		// Load caniuse-embed.min.js again for preview
		var DOMContentLoaded_event = document.createEvent("Event");
		DOMContentLoaded_event.initEvent("DOMContentLoaded", true, true);
		window.document.dispatchEvent(DOMContentLoaded_event);
	}

	return preview;
}

/* =====================
 * Initialise
 * =====================*/

var embedType = "interactive-embed";

new Clipboard(document.getElementById('copyStepOne'));
$('input[value="current"]').on('click', function() { return false; });

getFeatureList();

$('input[name="embed-type"]').on('change', function(e) {

	document.getElementById('step-script').setAttribute('hidden', 'hidden');
	document.getElementById('step-result').setAttribute('hidden', 'hidden');

	embedType = e.target.value;

	switch(embedType) {
		case "interactive-embed":
			document.getElementById('step-settings').removeAttribute('hidden');
			break;
	}
});

generateEmbedButton.addEventListener('click', function(e) {
	e.preventDefault();

	function generateInteractiveEmbed(featureID, periods, accessibleColours) {
		var preview = generatePreview(featureID, periods, accessibleColours);
		displayExportCode(preview);
		displayPreview(preview);

		document.getElementById('step-script').removeAttribute('hidden');
		document.getElementById('step-result').removeAttribute('hidden');
		ga('send', 'event', 'button', 'click', 'generate embed');
	}

	var featureID = $('select[name="featureID"]').val();
	var periods = getCheckedBoxes("periods").join();
	var accessibleColours = document.getElementById("add-accessible-colours").checked;

	switch(embedType) {
		case "interactive-embed":
			generateInteractiveEmbed(featureID, periods, accessibleColours);
			break;
	}

}); // end input submit
