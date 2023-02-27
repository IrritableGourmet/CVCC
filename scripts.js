class PageHandler{
	constructor(){
		try{
			this.notification_handler = new NotificationHandler();
			this.scratchpad = new ScratchPadHandler("txt_hippa");
			this.scratchpad.addTextboard(new OpeningTextboard());

		}catch(e){ console.log(e); }
	}
}

class GenericHandler{
	constructor(el){
		this.parent = this.findParent(document.getElementById(el));
	}

	findParent(el){

		if(!(el && el instanceof Element))
			return null;
		
		if(el.classList.contains('widget'))
			return el;

		return this.findParent(el.parentElement);
	}

	hide(){
		if(this.hasParent())
			this.parent.classList.add('d-none');
	}

	unhide(){
		if(this.hasParent())
			this.parent.classList.remove('d-none');
	}

	hasParent(){
		return (this.parent && this.parent instanceof Element);
	}

	isEmptyString(str){
		let str_test = new String(str);
		return !(str_test && str_test.trim().length > 0);
	}
}

class NotificationHandler{
	constructor(){
		this.notification_queue = [];
		//this.checkNotificationPermission(); //TODO: Uncomment
	}

	checkNotificationPermission(callback = null){
		try{
			if(!('Notification' in window))
				return false;

			switch(Notification.permission){
				case "granted":
					return true;

				case "denied":
					return false;

				case "default":
					Notification.requestPermission().then((response)=>{
						if(response === "granted" && callback instanceof Function)
							callback();
					});
					return false;
			}
		}catch(e){ console.log(e); return false; }
	}

	clearNotifications(){
		if(!this.notification_queue)
			this.notification_queue = [];

		while(this.notification_queue.length){
			try{ this.notification_queue.pop().close(); }catch(e){console.log(e);}
		}

	}

	sendNotification(body, title = null, purge = true){
		if(!this.checkNotificationPermission(this.sendNotification.bind(this, title, body)))
			return;

		if(purge) this.clearNotifications();

		this.notification_queue.push(new Notification(title ?? "NYSVAX", {
			body: body
		}));
	}
}

class TimeInterval{
	constructor(name, json){
		this.name = name;
		this.start = new Date(json.start);
		this.end = new Date(json.end);
	}

	toString(){
		return this.timeFormat(this.start) + ' - ' + this.timeFormat(this.end);
	}

	timeFormat(date){
		if(!(date && date instanceof Date))
			return '???';

		return date.toLocaleTimeString('en-US').replace(':00 ', '');
	}

	lateStart(){
		let offset = Date.now() - this.start.getTime();
		this.shiftMs(offset);
	}

	shift(hour = 0, minute = 0, second = 0){
		this.shiftMs(this.getMs(hour, minute, second));		
	}

	shiftMs(offset){
		this.start.setTime(this.start.getTime() + offset);
		this.end.setTime(this.end.getTime() + offset);
	}

	getMs(hour = 0, minute = 0, second = 0){
		return ((((hour * 60) + minute) * 60) + second) * 1000;
	}

	inInterval(){
		return(this.start && this.end && this.start <= Date.now() && this.end >= Date.now());
	}

	static getHRTimeDifference(diff){
		let sign = Math.sign(diff);			
		diff = Math.abs(diff);

		let seconds = Math.floor(diff / TimeInterval.msecSecond) % 60,
			minutes = Math.floor(diff / TimeInterval.msecMinute) % 60,
			hours = Math.floor(diff / TimeInterval.msecHour);

		return (sign < 0 ? '-' : '') + hours.toString().padStart(2, '0') + ':' + minutes.toString().padStart(2, '0') + ':' + seconds.toString().padStart(2, '0');
	}

	static getHRTimeUntil(time){
		return TimeInterval.getHRTimeDifference((time instanceof Date ? time.getTime() : time) - Date.now());
	}

	static getMs(hour = 0, minute = 0, second = 0){ return hour * TimeInterval.msecHour + minute * TimeInterval.msecMinute + second * TimeInterval.msecSecond; }

	static msecHour = 3600000;
	static msecMinute = 60000
	static msecSecond = 1000;

	static months = [ { name : "January", length: 31 }, { name : "February", length: 28 }, { name : "March", length: 31 }, { name : "April", length: 30 }, { name : "May", length: 31 }, { name : "June", length: 30 }, { name : "July", length: 31 }, { name : "August", length: 31 }, { name : "September", length: 30 }, { name : "October", length: 31 }, { name : "November", length: 30 }, { name : "December", length: 31 } ]; 
}

class GenericTextBoard extends GenericHandler{
	constructor(widget_id){
		super(widget_id);
		this.order = 0;
		this.active = false;
		this.str_output = new String();
		this.str_format = new String();
		this.initializeFields();
		this.unhide();
	}

	initializeFields(){
		this.fields = new Array();
		this.elements = new Array();
		this.parent.querySelectorAll("input").forEach(this.addField.bind(this));
		this.parent.querySelectorAll("select").forEach(this.addField.bind(this));
		this.parent.querySelectorAll("textarea").forEach(this.addField.bind(this));
	}

	addField(el){
		el.addEventListener('input', this.update.bind(this, el));
		this.fields[el.id ?? ''] = '';
		this.elements.push(el);
	}

	update(el, evt){
		let str_out = new String();
		switch(el.tagName){
			case 'INPUT':
				str_out += el.value;
				break;

			case 'TEXTAREA':
				str_out += el.value;
				break;

			case 'SELECT':
				let arr_selected = el.selectedOptions;
				for(let i = 0; i < arr_selected.length; i++){
					if(i > 0) str_out += ", ";
					if(i > 1 && i === arr_selected.length - 1) str_out += "and ";
					str_out += arr_selected[i].label;
				}
				break;
		}
		this.fields[el.id ?? ''] = str_out.trim();
	}

	clear(){
		this.str_output = new String();
		this.elements.forEach((el)=>{
			switch(el.tagName){
				case 'INPUT':
					el.value = '';
					break;

				case 'TEXTAREA':
					el.value = '';
					break;

				case 'SELECT':
					for(const opt of el.options) opt.selected = false;
					break;
			}
		});
	}

	updateOutput(){ this.str_output = "Not implemented."; }

	toString(){
		this.updateOutput();
		return this.str_output;
	}
}

class OpeningTextboard extends GenericTextBoard{
	constructor(){
		super("tb_caller");
	}

	updateOutput(){
		this.str_output = new String();

		if(this.isEmptyString(this.fields['caller_fname']) && this.isEmptyString(this.fields['caller_lname'])) return;

		this.str_output = this.str_output.concat(this.fields['caller_fname'], ' ', this.fields['caller_lname'], ' called CVCC ');
		if(!(this.isEmptyString(this.fields['client_fname']) && this.isEmptyString(this.fields['client_lname'])))
			this.str_output = this.str_output.concat('on behalf of ', this.fields['client_fname'], ' ', this.fields['client_lname']);

		if(!(this.isEmptyString(this.fields['call_reason']) && this.isEmptyString(this.fields['call_reason_other']))){
			this.str_output += ' to ' + this.fields['call_reason'];
			if(!this.isEmptyString(this.fields['call_reason_other'])){
				if(!this.isEmptyString(this.fields['call_reason'])) this.str_output += ' and ';
				this.str_output += this.fields['call_reason_other'];
			}
		}

		this.str_output += '.';
		
		if(!(this.isEmptyString(this.fields['client_ssn'])
			&& this.isEmptyString(this.fields['client_dob'])
			&& this.isEmptyString(this.fields['client_addr']) )){

			this.str_output += 'Verified NAME';

			if(!this.isEmptyString(this.fields['client_ssn'])) this.str_output += "/SSN";
			if(!this.isEmptyString(this.fields['client_dob'])) this.str_output += "/DOB";
			if(!this.isEmptyString(this.fields['client_addr'])) this.str_output += "/ADDR";

			this.str_output += " in state systems.";
		}
	}

}



class ScratchPadHandler extends GenericHandler{
	constructor(text_id){
		super(text_id);

		this.txt_pad = document.getElementById(text_id);
		if(!this.txt_pad)
			throw new Error("Could not find scratchpad!");

		this.boards = new Array();

		this.clear();
		this.unhide();
	}

	clear(){
		this.txt_pad.value = '';
		this.boards.forEach((b)=>{b.clear();});
	}

	addTextboard(board){
		board.parent.addEventListener('input', this.compileText.bind(this));
		this.boards.push(board);
	}

	compileText(){
		let str_output = new String();
		this.boards.forEach((val)=>{
			str_output += val.toString();
		});
		this.txt_pad.value = str_output;
	}
}
