var stdTimezoneOffset = function (date) {
    var jan = new Date(date.getFullYear(), 0, 1);
    var jul = new Date(date.getFullYear(), 6, 1);
    return Math.max(jan.getTimezoneOffset(), jul.getTimezoneOffset());
}
var isDstObserved = function (date) {
    return date.getTimezoneOffset() < stdTimezoneOffset(date);
}
// https://stackoverflow.com/questions/11887934/how-to-check-if-the-dst-daylight-saving-time-is-in-effect-and-if-it-is-whats

var d = new Date();

console.log(`${'So,Mo,Di,Mi,Do,Fr,Sa'.split(',')[d.getDay()]}. ${d.getDate()}. ${'Jan,Feb,Mrz,Apr,Mai,Jun,Jul,Aug,Sep,Okt,Nov,Dez'.split(',')[d.getMonth()]}. ${d.getFullYear()} ${d.toTimeString().slice(0, 8)} ${isDstObserved(d) ? 'CEST (UTC+2)' : 'CET (UTC+1)'}`)
