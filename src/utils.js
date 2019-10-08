const status_desc = require('./status_desc');
const unit_type = require('./unit_type');
const reject_note = require('./reject_note');
const { Int64LE } = require("int64-buffer");

module.exports = {
	parseData,
	randomInt,
	CRC16,
	randHexArray,
	argsToByte
}

function randomInt(min, max) {
	return Math.floor(Math.random() * (max - min)) + min;
}

function CRC16(source) {
	let length = source.length,
	seed = 0xFFFF,
	poly = 0x8005,
	crc = seed;
	
	for (let i = 0; i < length; i++) {
		crc ^= (source[i] << 8);
		for (let j = 0; j < 8; j++) {
			if (crc & 0x8000) {
				crc = ((crc << 1) & 0xffff) ^ poly;
			} else {
				crc <<= 1;
			}
		}
	}
	return [(crc & 0xFF), ((crc >> 8) & 0xFF)];
}

function randHexArray(length = 0){
	let array = [];
	for(let i=1; i<=length; i++){
		array.push(randomInt(0, 255))
	}
	return array;
}

function int32LE(number){
	let buffer = Buffer.alloc(4);
	buffer.writeInt32LE(number);
	return buffer;
}

function int16LE(number){
	let buffer = Buffer.alloc(2);
	buffer.writeInt16LE(number);
	return buffer;
}

function argsToByte(command, args, protocol_version){
	if(args != undefined){
		if(command == 'SET_DENOMINATION_ROUTE'){
			if(protocol_version >= 6){
				return [args.route == 'payout' ? 0 : 1].concat([...int32LE(args.value)], [...Buffer.from(args.country_code, 'ascii')]);
			} else {
				return [args.route == 'payout' ? 0 : 1].concat([...args.isHopper ? int16LE(args.value) : int32LE(args.value)])
			}
		}
		
		
		else if(command == 'SET_CHANNEL_INHIBITS'){
			let res = 0;
			args.channels.forEach((channel, i) => {
				if(i<16){
					res += channel ? (i == 0 ? 1 : i*2) : 0;
				}
			})
			return [...int16LE(res)];
		}
		
		
		else if(command == 'SET_COIN_MECH_GLOBAL_INHIBIT'){
			return [args.enable ? 1 : 0];
		}


		else if(command == 'SET_HOPPER_OPTIONS'){
			let res = 0;
			res += payMode ? 1 : 0;
			res += levelCheck ? 2 : 0;
			res += motorSpeed ? 4 : 0;
			res += cashBoxPayAcive ? 8 : 0;
			
			return [...int16LE(res)];
		}
		
		else if(command == 'GET_DENOMINATION_ROUTE'){
			if(protocol_version >= 6){
				return [...int32LE(args.value)].concat([...Buffer.from(args.country_code, 'ascii')]);
			} else {
				return [...args.isHopper ? int16LE(args.value) : int32LE(args.value)]
			}
		}
		
		
		else if(command == 'SET_DENOMINATION_LEVEL'){
			if(protocol_version >= 6){
				return [...int16LE(args.value)].concat([...int32LE(args.denomination)], [...Buffer.from(args.country_code, 'ascii')]);
			} else {
				return [...int16LE(args.value)].concat([...int16LE(args.denomination)])
			}
		}
		
		
		else if(command == 'SET_REFILL_MODE'){
			let result = [];
			if(args.mode == 'on'){
				result = [0x05, 0x81, 0x10, 0x11, 0x01];
			} else if(args.mode == 'off'){
				result = [0x05, 0x81, 0x10, 0x11, 0x00];
			} else if(args.mode == 'get'){
				result = [0x05, 0x81, 0x10, 0x01];
			}

			return result;
		}


		else if(command == 'HOST_PROTOCOL_VERSION'){
			return [args.version];
		}


		else if(command == 'SET_BAR_CODE_CONFIGURATION'){
			let enable = { none: 0, top: 1, bottom: 2, both: 3 };
			let number = args.numChar || 6
			if(number < 6){ number = 6; }
			if(number > 24){ number = 24; }

			return [enable[args.enable || 'none'], 0x01, number]
		}


		else if(command == 'SET_BAR_CODE_INHIBIT_STATUS'){
			let byte = 0xff;
			byte -= args.currencyRead ? 1 : 0;
			byte -= args.barCode ? 2 : 0;
			
			return [byte];
		}


		else if(command == 'PAYOUT_AMOUNT'){
			if(protocol_version >= 6){
				return [...int32LE(args.amount)].concat([...Buffer.from(args.country_code, 'ascii')], [args.test ? 0x19 : 0x58]);
			} else {
				return [...int32LE(args.amount)];
			}
		}


		else if(command == 'GET_DENOMINATION_LEVEL'){
			if(protocol_version >= 6){
				return [...int32LE(args.amount)].concat([...Buffer.from(args.country_code, 'ascii')]);
			} else {
				return [...int32LE(args.amount)];
			}
		}


		else if(command == 'FLOAT_AMOUNT'){
			if(protocol_version >= 6){
				return [...int16LE(args.min_possible_payout)].concat([...int32LE(args.amount)], [...Buffer.from(args.country_code, 'ascii')], [args.test ? 0x19 : 0x58]);
			} else {
				return [...int16LE(args.min_possible_payout)].concat([...int32LE(args.amount)])
			}
		}


		else if(command == 'SET_COIN_MECH_INHIBITS'){
			if(protocol_version >= 6){
				return [args.inhibited ? 0x00 : 0x01].concat([...int32LE(args.amount)], [...Buffer.from(args.country_code, 'ascii')]);
			} else {
				return [args.inhibited ? 0x00 : 0x01].concat([...int32LE(args.amount)]);
			}
		}


		else if(command == 'FLOAT_BY_DENOMINATION' || command == 'PAYOUT_BY_DENOMINATION'){
			let tmpArray = [args.value.length];
			
			for(let i=0; i<args.value.length; i++){
				tmpArray = tmpArray.concat([...int16LE(args.value[i].number)], [...int32LE(args.value[i].denomination)], [...Buffer.from(args.value[i].country_code, 'ascii')])
			}

			return tmpArray.concat([args.test ? 0x19 : 0x58]);
		}


		else if(command == 'SET_VALUE_REPORTING_TYPE'){
			return [args.reportBy == 'channel' ? 0x01 : 0x00];
		}


		else if(command == 'SET_BAUD_RATE'){
			let byte = 0;
			if(args.baudrate == 9600){byte = 0;}
			else if(args.baudrate == 38400){byte = 1;}
			else if(args.baudrate == 115200){byte = 2;}

			return [byte, reset_to_default_on_reset ? 0 : 1];
		}


		else if(command == 'CONFIGURE_BEZEL'){
			return [...Buffer.from(args.RGB, 'hex')].concat(args.volatile ? 0 : 1);
		}


		else if(command == 'ENABLE_PAYOUT_DEVICE'){
			let byte = 0;
			byte += args.GIVE_VALUE_ON_STORED || args.REQUIRE_FULL_STARTUP ? 1 : 0;
			byte += args.NO_HOLD_NOTE_ON_PAYOUT || args.OPTIMISE_FOR_PAYIN_SPEED ? 2 : 0;
			return [byte];
		}
		
		
		else if(command == 'SET_FIXED_ENCRYPTION_KEY'){
			return Int64LE(args.fixedKey, 16).buffer;
		}


		else if(command == 'COIN_MECH_OPTIONS'){
			return [args.ccTalk ? 1 : 0];
		}
		
		else {
			return []
		}
	} else {
		return [];
	}
	
}

function parseData(data, currentCommand, protocol_version) {
	let result = {
		success: data[0] == 0xF0,
		status: status_desc[data[0]] != undefined ? status_desc[data[0]].name : 'UNDEFINED',
		command: currentCommand,
		info: {}
	}

	if(result.success) {
		data = data.slice(1);


		if(currentCommand == 'REQUEST_KEY_EXCHANGE') {
			result.info.key = data;
		}


		else if(currentCommand == 'SETUP_REQUEST') {
			result.info.unit_type = unit_type[data[0]];
			result.info.firmware_version = (parseInt(Buffer.from(data.slice(1, 5)).toString())/100).toFixed(2)
			result.info.country_code = Buffer.from(data.slice(5, 8)).toString()

			if(data[0] == 3) {
				result.info.protocol_version = parseInt(data.slice(8, 9).toString('hex'))
				let n = parseInt(Buffer.from(data.slice(9, 10)).toString('hex'))
				result.info.coin_values = data.slice(10, 10+(n*2))
				result.info.country_codes_for_values = Buffer.from(data.slice(10+(n*2), 10+(n*2)+(n*3))).toString().match(/.{3}/g)
			} else {
				result.info.value_multiplier = parseInt(Buffer.from(data.slice(8, 11)).toString('hex'))
				let n = parseInt(Buffer.from(data.slice(11, 12)).toString('hex'))
				result.info.channel_value = data.slice(12, 12+n)
				result.info.channel_security = data.slice(12+n, 12+(n*2))
				result.info.real_value_multiplier = parseInt((12+(n*2), 12+(n*2)+3).toString(16))
				result.info.protocol_version = parseInt(data.slice(15+(n*2), 15+(n*2)+1).toString('hex'))
				if(result.info.protocol_version >= 6){
					result.info.expanded_channel_country_code = Buffer.from(data.slice(16+(n*2), 16+(n*2)+(n*3))).toString().match(/.{3}/g)
					result.info.expanded_channel_value = []
					for(let i=0; i<n; i++){
						result.info.expanded_channel_value[i] = Buffer.from(data.slice(16+(n*5)+(i*4), 20+(n*5)+(i*4))).readInt32LE();
					}
				}
			}
		}


		else if(currentCommand == 'GET_SERIAL_NUMBER') {
			result.info.serial_number = Buffer.from(data.slice(0, 4)).readInt32BE()
		}


		else if(currentCommand == 'UNIT_DATA') {
			result.info.unit_type = unit_type[data[0]];
			result.info.firmware_version = (parseInt(Buffer.from(data.slice(1, 5)).toString())/100).toFixed(2)
			result.info.country_code = Buffer.from(data.slice(5, 8)).toString()
			result.info.value_multiplier = parseInt(data.slice(8, 11).toString('hex'))
			result.info.protocol_version = parseInt(data.slice(11, 12).toString('hex'))
		}


		else if(currentCommand == 'CHANNEL_VALUE_REQUEST') {
			let count = data[0];
			
			if(protocol_version >= 6) {
				result.info.channel = data.slice(1, count+1)
				result.info.country_code = Buffer.from(data.slice(count+1, (count*4)+1)).toString().match(/.{3}/g)
				result.info.value = Buffer.from(data.slice((count*4)+1, (count*8)+1)).toString('hex').match(/.{8}/g).map(value => Buffer.from(value, 'hex').readInt32LE())
			} else {
				result.info.channel = data.slice(1, count+1)
			}
		}


		else if(currentCommand == 'CHANNEL_SECURITY_DATA') {
			let level = {
				0: 'not_implemented',
				1: 'low',
				2: 'std',
				3: 'high',
				4: 'inhibited'
			}
			result.info.chanel = {};
			for(let i=1; i<=data[0]; i++){
				result.info.chanel[i] = level[data[i]];
			}
		}


		else if(currentCommand == 'CHANNEL_RE_TEACH_DATA') {
			result.info.source = data;
		}


		else if(currentCommand == 'LAST_REJECT_CODE') {
			result.info.code = data[0];
			result.info.name = reject_note[data[0]].name;
			result.info.description = reject_note[data[0]].description;
		}


		else if(currentCommand == 'GET_FIRMWARE_VERSION' || currentCommand == 'GET_DATASET_VERSION') {
			result.info.version = Buffer.from(data).toString()
		}


		else if(currentCommand == 'GET_ALL_LEVELS') {
			result.info.counter = {}
			for(let i=0; i<data[0]; i++){
				let tmp = data.slice((i*9)+1, (i*9)+10);
				result.info.counter[i+1] = {
					'denomination_level': Buffer.from(tmp.slice(0, 2)).readInt16LE(),
					'value': Buffer.from(tmp.slice(2, 6)).readInt32LE(),
					'country_code': Buffer.from(tmp.slice(6, 9)).toString()
				}
			}
		}


		else if(currentCommand == 'GET_ALL_LEVELS') {
			let status = {
				0: { 0: 'none', 1: 'Top reader fitted', 2: 'Bottom reader fitted', 3: 'both fitted'	},
				1: { 0: 'none', 1: 'top', 2: 'bottom', 3: 'both' },
				2: { 1: 'Interleaved 2 of 5'}
			}
			result.info = {
				'bar_code_hardware_status': status[0][data[0]],
				'readers_enabled': status[1][data[1]],
				'bar_code_format': status[2][data[2]],
				'number_of_characters': data[3]
			}
		}


		else if(currentCommand == 'GET_BAR_CODE_INHIBIT_STATUS') {
			result.info.currency_read_enable = data[0].toString(2).slice(7, 8) == '0';
			result.info.bar_code_enable = data[0].toString(2).slice(6, 7) == '0';
		}


		else if(currentCommand == 'GET_BAR_CODE_DATA') {
			let status = { 0: 'no_valid_data', 1: 'ticket_in_escrow', 2: 'ticket_stacked', 3: 'ticket_rejected'	}
			result.info.status = status[data[0]];
			result.info.data = Buffer.from(data.slice(2, data[1]+2)).toString();
		}


		else if(currentCommand == 'GET_DENOMINATION_LEVEL') {
			result.info.level = Buffer.from(data).readInt16LE();
		}


		else if(currentCommand == 'GET_DENOMINATION_ROUTE') {
			let res = { 0: { code: 0, value: 'Recycled and used for payouts'}, 1: { code: 1, value: 'Detected denomination is routed to system cashbox'}}
			result.info = res[data[0]]
		}


		else if(currentCommand == 'GET_MINIMUM_PAYOUT') {
			result.info.value = Buffer.from(data).readInt32LE();
		}


		else if(currentCommand == 'GET_NOTE_POSITIONS') {
			let count = data[0]
			data = data.slice(1);
			result.info.slot = {};
			
			if(data.length == count){
				for(let i=0; i<count; i++){
					result.info.slot[i+1] = { chanel: data[i] }
				}
			} else {
				let tmp = Buffer.from(data).toString().match(/.{4}/g)
				for(let i=0; i<count; i++){
					result.info.slot[i+1] = { value: tmp[i] }
				}
			}
		}


		else if(currentCommand == 'GET_BUILD_REVISION') {
			let count = data.length / 3;
			result.info.device = {};
			for(let i=0; i<count; i++){
				result.info.device[i] = {
					unit_type: unit_type[data[(i*3)]],
					revision: Buffer.from(data.slice((i*3)+1, (i*3)+3)).readInt16BE()
				}
			}
		}


		else if(currentCommand == 'GET_COUNTERS') {
			result.info.stacked = Buffer.from(data.slice(1, 5)).readInt32LE();
			result.info.stored = Buffer.from(data.slice(5, 9)).readInt32LE();
			result.info.dispensed = Buffer.from(data.slice(9, 13)).readInt32LE();
			result.info.transferred_from_store_to_stacker = Buffer.from(data.slice(13, 17)).readInt32LE();
			result.info.rejected = Buffer.from(data.slice(17, 21)).readInt32LE();
		}

		else if(currentCommand == 'GET_HOPPER_OPTIONS') {
			let tmp = Buffer.from(data.slice(1, 3)).readInt16LE().toString(2).split('').reverse();
			result.info.payMode = (tmp[0] == 0 || tmp[0] == undefined) ? false : true;
			result.info.levelCheck = (tmp[1] == 0 || tmp[1] == undefined) ? false : true;
			result.info.motorSpeed = (tmp[2] == 0 || tmp[2] == undefined) ? false : true;
			result.info.cashBoxPayAcive = (tmp[3] == 0 || tmp[3] == undefined) ? false : true;
		}


		else if(currentCommand == 'POLL' || currentCommand == 'POLL_WITH_ACK') {
			if(data[0] != undefined && status_desc[data[0]] != undefined){
				result.info.code = data[0];
				result.info.name = status_desc[data[0]].name;
				result.info.description = status_desc[data[0]].description;


				if(result.info.name == 'READ_NOTE' || 
					result.info.name == 'CREDIT_NOTE' || 
					result.info.name == 'NOTE_CLEARED_FROM_FRONT' || 
					result.info.name == 'NOTE_CLEARED_TO_CASHBOX'
					){
						result.info.chanel = data[1];
				}


				else if(result.info.name == 'FRAUD_ATTEMPT'){
					if(data.length == 2){
						result.info.chanel = data[1];
					} else if(data.length == 5){
						result.info.value = Buffer.from(data.slice(1, 5)).readInt32LE();
					} else {
						let count = Math.floor(data.length / 6);
						result.info.value = [];
						for(let i=0; i<count; i++){
							result.info.value[i] = {
								value: Buffer.from(data.slice((i*7)+1, (i*7)+5)).readInt32LE(),
								country_code: Buffer.from(data.slice((i*7)+5, (i*7)+8)).toString()
							}
						}
					}
				}


				else if(result.info.name == 'DISPENSING' || 
					result.info.name == 'DISPENSED' || 
					result.info.name == 'JAMMED' || 
					result.info.name == 'HALTED' || 
					result.info.name == 'FLOATING' ||
					result.info.name == 'FLOATED' ||
					result.info.name == 'TIME_OUT' ||
					result.info.name == 'CASHBOX_PAID' ||
					result.info.name == 'COIN_CREDIT' ||
					result.info.name == 'SMART_EMPTYING' ||
					result.info.name == 'SMART_EMPTIED' ||
					result.info.name == 'ERROR_DURING_PAYOUT' ||
					result.info.name == 'NOTE_TRANSFERED_TO_STACKER' ||
					result.info.name == 'NOTE_HELD_IN_BEZEL' ||
					result.info.name == 'NOTE_PAID_INTO_STORE_AT_POWER-UP' ||
					result.info.name == 'NOTE_PAID_INTO_STACKER_AT_POWER-UP' ||
					result.info.name == 'NOTE_DISPENSED_AT_POWER-UP'
					){

					if(protocol_version >= 6) {
						let count = data[1];
						result.info.value = [];
						for(let i=0; i<count; i++){
							result.info.value[i] = {
								value: Buffer.from(data.slice((i*7)+2, (i*7)+6)).readInt32LE(),
								country_code: Buffer.from(data.slice((i*7)+6, (i*7)+9)).toString()
							}
						}
						if(result.info.name == 'ERROR_DURING_PAYOUT'){
							result.info.errorCode = data[(count*7)+1] == 0 ? 'wrong_recognition' : 'jammed';
						}
					} else {
						result.info.value = Buffer.from(data.slice(0, 4)).readInt32LE();
					}
				}


				else if(result.info.name == 'INCOMPLETE_PAYOUT'){
					if(data.length == 9){
						result.info.dispensed = Buffer.from(data.slice(1, 5)).readInt32LE();
						result.info.requested = Buffer.from(data.slice(5, 9)).readInt32LE();
					} else {
						let count = Math.floor(data.length / 11);
						result.info.value = [];
						for(let i=0; i<count; i++){
							result.info.value[i] = {
								dispensed: Buffer.from(data.slice((i*11)+1, (i*11)+5)).readInt32LE(),
								requested: Buffer.from(data.slice((i*11)+5, (i*11)+9)).readInt32LE(),
								country_code: Buffer.from(data.slice((i*11)+9, (i*11)+12)).toString()
							}
						}
					}
				}


				else if(result.info.name == 'INCOMPLETE_FLOAT'){
					if(data.length == 9){
						result.info.dispensed = Buffer.from(data.slice(1, 5)).readInt32LE();
						result.info.floated = Buffer.from(data.slice(5, 9)).readInt32LE();
					} else {
						let count = Math.floor(data.length / 11);
						result.info.value = [];
						for(let i=0; i<count; i++){
							result.info.value[i] = {
								floated: Buffer.from(data.slice((i*11)+1, (i*11)+5)).readInt32LE(),
								requested: Buffer.from(data.slice((i*11)+5, (i*11)+9)).readInt32LE(),
								country_code: Buffer.from(data.slice((i*11)+9, (i*11)+12)).toString()
							}
						}
					}
				}


				else if(currentCommand == 'CASHBOX_PAYOUT_OPERATION_DATA'){
					result.info = { res: {}}
					console.log(data)
					for(let i=0; i<data[0]; i++){
						result.info.res[i] = {
							quantity: Buffer.from(data.slice((i*9)+2, (i*9)+4)).readInt16LE(),
							value: Buffer.from(data.slice((i*9)+4, (i*9)+8)).readInt32LE(),
							country_code: Buffer.from(data.slice((i*9)+8, (i*9)+11)).toString()
						}
					}
				} 

			}
		}
	} else {

		if(result.status == 'COMMAND_CANNOT_BE_PROCESSED' && currentCommand == 'ENABLE_PAYOUT_DEVICE') {
			result.info.errorCode = data[1];
			switch(data[1]){
				case 1: result.info.error = 'No device connected'; break;
				case 2: result.info.error = 'Invalid currency detected'; break;
				case 3: result.info.error = 'Device busy'; break;
				case 4: result.info.error = 'Empty only (Note float only)'; break;
				case 5: result.info.error = 'Device error'; break;
			}
		}


		else if(result.status == 'COMMAND_CANNOT_BE_PROCESSED' && (
			currentCommand == 'PAYOUT_BY_DENOMINATION' || 
			currentCommand == 'FLOAT_AMOUNT' || 
			currentCommand == 'PAYOUT_AMOUNT'
			)) {
				result.info.errorCode = data[1];
			switch(data[1]){
				case 1: result.info.error = 'Not enough value in device'; break;
				case 2: result.info.error = 'Cannot pay exact amount'; break;
				case 3: result.info.error = 'Device busy'; break;
				case 4: result.info.error = 'Device disabled'; break;
			}
		}


		else if(result.status == 'COMMAND_CANNOT_BE_PROCESSED' && (
			currentCommand == 'SET_VALUE_REPORTING_TYPE' || 
			currentCommand == 'GET_DENOMINATION_ROUTE' || 
			currentCommand == 'SET_DENOMINATION_ROUTE'
			)) {
			
			result.info.errorCode = data[1];
			switch(data[1]){
				case 1: result.info.error = 'No payout connected'; break;
				case 2: result.info.error = 'Invalid currency detected'; break;
				case 3: result.info.error = 'Payout device error'; break;
			}
		}


		else if(result.status == 'COMMAND_CANNOT_BE_PROCESSED' && currentCommand == 'FLOAT_BY_DENOMINATION') {
			result.info.errorCode = data[1];
			switch(data[1]){
				case 1: result.info.error = 'Not enough value in device'; break;
				case 2: result.info.error = 'Cannot pay exact amount'; break;
				case 3: result.info.error = 'Device busy'; break;
				case 4: result.info.error = 'Device disabled'; break;
			}
		}


		else if(result.status == 'COMMAND_CANNOT_BE_PROCESSED' && (currentCommand == 'STACK_NOTE' || currentCommand == 'PAYOUT_NOTE')) {
			result.info.errorCode = data[1];
			switch(data[1]){
				case 1: result.info.error = 'Note float unit not connected'; break;
				case 2: result.info.error = 'Note float empty'; break;
				case 3: result.info.error = 'Note float busy'; break;
				case 4: result.info.error = 'Note float disabled'; break;
			}
		}


		else if(result.status == 'COMMAND_CANNOT_BE_PROCESSED' && currentCommand == 'GET_NOTE_POSITIONS') {
			result.info.errorCode = data[1];
			if(data[1] == 2) {
				result.info.error = 'Invalid currency';
			}
		}
	}

	return result;
}