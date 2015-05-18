// ==UserScript==
// @name        LovecraftEmDashes
// @namespace   http://gerweck.org/
// @include     http://www.dagonbytes.com/thelibrary/lovecraft/*.htm
// @version     1
// @grant       none
// @require     https://raw.githubusercontent.com/leecrossley/functional-js/master/functional.min.js
// ==/UserScript==
// ==ClosureCompiler==
// @output_file_name default.js
// @compilation_level ADVANCED_OPTIMIZATIONS
// @code_url https://raw.githubusercontent.com/leecrossley/functional-js/master/functional.min.js
// @js_externs var fjs; fjs.isString = function(a){};
// ==/ClosureCompiler==

var RegexUtil = (function() {
	var exports = {};

	/** Basic replacement function */
	var replacer = function(x, y) {
		return x.replace(y[0], y[1]);
	};

	/** Apply many regexes in sequence */
	exports.multiRegex = fjs.curry(function(re, s) {
		return fjs.fold(replacer, s, re);
	});

	return exports;
})();

var Beautifier = (function() {
	var exports = {};

	/* Import a helper function from regex utils. */
	var applyRegexes = RegexUtil.multiRegex;

	/** Helpers for generating small caps */
	var smallCapStyle = 'font-varant: small-caps; font-variant-caps: all-small-caps;';
	exports.smallCapSpan = function(body) {
		return '<span style="' + smallCapStyle + '">' + body + '</span>';
	};

	/** Standard typographic formatting */
	var regexes = [
		[/(°\d+)'/g,             '$1′'],
		[/(′\d+)"/g,             '$1″'],
		[/^'s(\s)/g,             '’s$1'],
		[/([^\s'])'([^']|$)/g,   '$1’$2'],
		[/(^|\s)'(\S)/g,         '$1‘$2'],
		[/(^|\s)"([^\s"])/g,     '$1“$2'],
		[/([^\s"])"([,.\s]|$)/g, '$1”$2'],
		[/(\d)-(\d)/g,           '$1–$2'],
		[/\s+-\s+|--| -- /g,     '—'],
		[/\Q...\E/g,             '…']
	];
	exports.apply = applyRegexes(regexes);

	/** Small-cap typesetting of am & pm */
	var ampmRegexes = [
		[/\bA\.M\.(?!\w)/g, exports.smallCapSpan('am')],
		[/\bP\.M\.(?!\w)/g, exports.smallCapSpan('pm')]
	];
	exports.ampm = applyRegexes(ampmRegexes);

	return exports;
})();

var ContentMapper = function(xpath) {
	var exports = {};

	var forAllNodes = function(mapper) {
		var nodes =
			document.evaluate(xpath, document, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
		for (var i = 0; i < nodes.snapshotLength; i++) {
			var node = nodes.snapshotItem(i);
			mapper(node);
		}
	};

	var forUniqueNode = function(mapper) {
		var ccNodes =
			document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
		var ccn = ccNodes.singleNodeValue;
		if (ccn) {
			mapper(ccn);
		}
	};

	var Mapper = function(nodeLister, mapperBuilder) {
		var exports = {};

		var builder = function(mapper) {
			nodeLister(mapperBuilder(mapper));
		};

		exports.generic = builder;

		exports.regex = function(re, repl) {
			var mapper = function(s) { return s.replace(re, repl) };
			builder(mapper);
		}

		exports.multiRegex = function(regexes) {
			builder(RegexUtil.multiRegex(regexes));
		};

		return exports;
	};

	var MetaMapper = function(uncurried) {
		var builder = fjs.curry(uncurried);
		return {
			All:    Mapper(forAllNodes, builder),
			Unique: Mapper(forUniqueNode, builder)
		};
	};

	exports.Text = MetaMapper('mapper, n => n.data      = mapper(n.data)');
	exports.Html = MetaMapper('mapper, n => n.innerHTML = mapper(n.innerHTML)');

	return exports;
};

// Apply basic beautification to the page.
var mapper = ContentMapper('/html/body/center/table/tbody//text()');
mapper.Text.All.generic(Beautifier.apply);

// Apply small-caps AM & PM typesetting.
var fullTextMapper = ContentMapper('/html/body/center/table/tbody');
fullTextMapper.Html.All.generic(Beautifier.ampm);

// Beautify a particular bit in Call of Cthulhu with small caps.
var smallCapCoC = function() {
	var ccPath = '/html/body/center/table/tbody//*[contains(text(), "headed \“CTHULHU CULT")]';
	var newHtml = Beautifier.smallCapSpan('cthulhu cult')
	ContentMapper(ccPath).Html.Unique.regex(/CTHULHU CULT/g, newHtml);
};
smallCapCoC();

// Miscellaneous misspellings and errors.
mapper.Text.All.multiRegex([
	[/the way clown toward/g, 'the way down toward'],
	[/stung th disappointment/g, 'stung with disappointment'],
	[/Persuad-g/g, 'Persuading'],
	[/l23°/g, '123°'],
	[/but johansen drove/g, 'but Johansen drove']
]);
