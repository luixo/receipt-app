export const formatIsoDate = (date: Date) => date.toISOString().slice(0, 10);
export const formatDate = (date: Date) => date.toLocaleDateString();

export const getToday = () => {
	const now = new Date();
	now.setUTCHours(0, 0, 0, 0);
	return now;
};
