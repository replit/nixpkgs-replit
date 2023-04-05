'use strict';
const execa = require('execa');
const titleize = require('titleize');

module.exports = function () {
	if (process.platform !== 'linux') {
		return Promise.reject(new Error('Only Linux systems are supported'));
	}

	return execa('xdg-mime', ['query', 'default', 'x-scheme-handler/http']).then(res => {
		const stdout = res.stdout.trim();

		return {
			name: titleize(stdout.replace(/.desktop$/, '').replace('-', ' ')),
			id: stdout
		};
	});
};
