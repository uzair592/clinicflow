const Timeline = ({ events }) => {
  // events should have: date, type (appointment|prescription|diagnosis), title, description

  const getColor = (type) => {
    switch (type) {
      case 'appointment': return 'bg-blue-500 border-blue-200 text-blue-800 bg-blue-50';
      case 'prescription': return 'bg-purple-500 border-purple-200 text-purple-800 bg-purple-50';
      case 'diagnosis': return 'bg-emerald-500 border-emerald-200 text-emerald-800 bg-emerald-50';
      default: return 'bg-slate-500 border-slate-200 text-slate-800 bg-slate-50';
    }
  };

  return (
    <div className="relative border-l border-slate-200 ml-3 space-y-6 pb-4">
      {events.map((event, idx) => {
        const classes = getColor(event.type);
        const [dotColor, borderColor, textColor, bgColor] = classes.split(' ');

        return (
          <div key={idx} className="relative pl-6">
            <span className={`absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full ${dotColor} ring-4 ring-white`}></span>
            <div className={`p-4 rounded-lg border ${borderColor} ${bgColor}`}>
              <div className="flex justify-between items-start mb-1">
                <h3 className={`font-semibold text-sm ${textColor}`}>{event.title}</h3>
                <span className="text-xs font-medium text-slate-500">{new Date(event.date).toLocaleDateString()}</span>
              </div>
              <p className="text-sm text-slate-600 mt-1">{event.description}</p>
            </div>
          </div>
        );
      })}
      
      {events.length === 0 && (
        <div className="pl-6 text-sm text-slate-500 py-4">No medical history available.</div>
      )}
    </div>
  );
};

export default Timeline;
