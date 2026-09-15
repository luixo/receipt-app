export const freezeTemporal = (date: Temporal.PlainDateTime) => {
	Temporal.Now.zonedDateTimeISO = () => date.toZonedDateTime("UTC");
	Temporal.Now.plainDateTimeISO = () => date;
	Temporal.Now.plainDateISO = () => date.toPlainDate();
	Temporal.Now.plainTimeISO = () => date.toPlainTime();
	Temporal.Now.instant = () => date.toZonedDateTime("UTC").toInstant();
};
