import flatten from 'flat';

const unflatten = flatten.unflatten;

class Stream {
	constructor() {
		this.data = {};
		this.FLAT_DELIMITER = '~';
		this.POSTFIX = 'STREAM';
		this.CONNECTOR = ':';
	}

	formatValues(values, format, limit){
		if(limit) values.splice(0, limit);

		return format
			? values.map(v => unflatten(v, { delimiter: this.FLAT_DELIMITER }))
			: [values.map(v => {
				const { _messageId } = v;
				const entries = Object.entries(v).filter(([key]) => key !== _messageId)
				;return [_messageId, entries.flat()];
			})];
	}

	add(key, value, id = '*'){
		if (!value || value.constructor.name !== 'Object') return false;

		const data = this.data[key] || [];
		const _messageId = id !== '*' || data.length;

		const values = flatten({...value, _messageId }, { delimiter: this.FLAT_DELIMITER });

		data.push(values);
		this.data[key] = data;

		return _messageId;
	}

	async range(key, schema, limit, begin = '-', end = '+', format = true){
		if(!this.data[key]) return null;

		const startIndex = begin === '-' ? 0 : this.data[key].findIndex(
			({ _messageId }) => _messageId === begin
		);

		const endIndex = end === '+' ? this.data[key].length : this.data[key].findIndex(
			({ _messageId }) => _messageId === end
		);

		if(startIndex > endIndex) return [];

		const values = this.data[key].slice(startIndex, endIndex + 1);

		return this.formatValues(values, format, limit);
	}

	async revRange(key, schema, limit, begin = '-', end = '+', format = true){
		if(!this.data[key]) return null;

		const startIndex = begin === '-' ? 0 : this.data[key].findIndex(
			({ _messageId }) => _messageId === begin
		);

		const endIndex = end === '+' ? this.data[key].length : this.data[key].findIndex(
			({ _messageId }) => _messageId === end
		);

		if(startIndex > endIndex) return [];

		const values = this.data[key].slice(startIndex, endIndex + 1).reverse();

		return this.formatValues(values, format, limit);
	}
}

export default Stream;
