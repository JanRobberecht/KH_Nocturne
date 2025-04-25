/**
 * Koppel de juiste spreadsheets en worksheets aan de variabelen
 * In de code worden onderstaande variabelen geberuikt voor:
 *  - wsAvalibility  - 1e 2 kolommen worden uitgelezen; niks wordt weggeschreven
 *  - wsAccepted     - volledige dataRange wordt uitgelezen en de nieuwe input wordt weggeschreven
 *  - wsRejected     - de nieuwe input wordt weggeschreven
 **/

const ss = SpreadsheetApp.getActiveSpreadsheet();
const wsAvailability = ss.getSheetByName("Beschikbaarheid");
const wsRejected = ss.getSheetByName("Geweigerde reservaties");
const wsAccepted = ss.getSheetByName("Geaccepteerde reservaties");


/**
 * "Shows" haalt de datum/uur en het totaal tickets van de voorstellingen op uit wsAvailability
 * Zelf noteren op welke index de datum/uur staan en op welke het aantal tickets
 *                - kolom A wordt index 0, 
 *                - kolom B wordt index 1
 **/

const shows = wsAvailability.getRange("A2:B3").getValues()
const indexTotalShow = 0;
const indexTotalTickets = 1;


/**
 * De responseKeys komen overeen met de kolomkop van "Formulierreacties1".  
 * De volgorde van de kolomkoppen van links naar rechts, moet behouden blijven
 *    ...maar in de array (responseKeys) mag je de naam zelf kiezen.
 * Uit de array wordt de index van bepaakde kolommen bepaald die later
 *    ...gebruikt zal worden in de functie updateTicketCount()
 **/

const responseKeys = ["timestamp", "email", "firstName", "lastName", "group", "show", "tickets"]
const indexShow = responseKeys.indexOf("show")
const indexTickets = responseKeys.indexOf("tickets")


/**
 * De eigenlijke functie die alle gegevens van hierboven gebruikt.
 * In de logica moet in weze niets veranderd worden
 * 
 **/

function updateTicketCount(e) {

  // Leegmaken van variabelen
  // Installeren van Lock waardoor de fucntie nooit gelijktijdig kan lopen
  var response = {}
  var availableTickets = 0
  var acceptedTickets = 0
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  if (lock.hasLock()) {

    // Een seconde geven om de spreadsheet te laten updaten
    Utilities.sleep(1000);

    // Een object maken van de laatste input die meegegeven is met parameter e
    let responseArray = e.range.getValues().flat()
    response = Object.fromEntries(responseKeys.map((key, i) => [key, responseArray[i]]));

    // Totaal aantal tickets van de gekozen voorstelling opalen uit "shows"
    // Berekenen van de som van het aantal tickets van de geaccepteerde reservaties voor de gekozen voorstelling
    // Berekenen van de beschikbare tickets.
    let totalTickets = () => { return shows.filter(x => x[indexTotalShow] == response.show).flat() }
    let acceptedResponses = wsAccepted.getDataRange().getValues()
    for (let a of acceptedResponses) { a[indexShow] == response.show ? acceptedTickets += a[indexTickets] : ""; }
    availableTickets = totalTickets()[indexTotalTickets] - acceptedTickets

    // Bij aceptatie of weigering de laatste input op de juiste sheet zetten en de mail versturen 
    if (response.tickets <= availableTickets) {
      wsAccepted.appendRow(responseArray)
      sendMail("accepted", response.email, response.show, response.tickets, availableTickets)
    }

    if (response.tickets > availableTickets) {
      wsRejected.appendRow(responseArray)
      sendMail("rejected", response.email, response.show, response.tickets, availableTickets)
    }

    lock.releaseLock();
  }
}

function sendMail(type, email, show, tickets, availableTickets) {

  let template = HtmlService.createTemplateFromFile("mail");

  template.type = type;
  template.show = show;
  template.tickets = tickets;
  template.availableTickets = availableTickets;
  let message = template.evaluate().getContent();
  let subject

  type == "accepted" ? subject = "Bevestiging van je ticketreservering" : subject = "Ticketreservering mislukt" ;
 
  MailApp.sendEmail(email, subject,"", {htmlBody: message});
}


