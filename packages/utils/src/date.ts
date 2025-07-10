export const getNow = () => new Date();

export const getToday = () => {
	const now = getNow();
	now.setUTCHours(0, 0, 0, 0);
	return now;
};
