/* Shared interface labels only. Company names, entered content and commercial terms are never translated. */
window.I18n=(()=>{
const translations = {
  ml:{'Overview':'അവലോകനം','Marketplace':'വിപണിസ്ഥലം','Customers':'ഉപഭോക്താക്കൾ','Quotations':'ക്വട്ടേഷനുകൾ','Inventory':'സ്റ്റോക്ക്','Accounts':'അക്കൗണ്ടുകൾ','Customer service':'ഉപഭോക്തൃ സേവനം','Team & settings':'ടീമും ക്രമീകരണങ്ങളും','Virtual CEO':'വെർച്വൽ സി.ഇ.ഒ.','My enquiries':'എന്റെ അന്വേഷണങ്ങൾ','My quotations':'എന്റെ ക്വട്ടേഷനുകൾ','My orders':'എന്റെ ഓർഡറുകൾ','Profile & settings':'പ്രൊഫൈലും ക്രമീകരണങ്ങളും','Find a distributor':'വിതരണക്കാരനെ കണ്ടെത്തുക','Product categories':'ഉൽപ്പന്ന വിഭാഗങ്ങൾ','Home':'ഹോം','Customer dashboard':'ഉപഭോക്തൃ ഡാഷ്ബോർഡ്','Compare quotations':'ക്വട്ടേഷനുകൾ താരതമ്യം ചെയ്യുക','Installation progress':'ഇൻസ്റ്റലേഷൻ പുരോഗതി','Leads & CRM':'ലീഡുകളും ഉപഭോക്താക്കളും','Projects & installations':'പ്രോജക്റ്റുകളും ഇൻസ്റ്റലേഷനും'},
  ta:{'Overview':'கண்ணோட்டம்','Marketplace':'சந்தை','Customers':'வாடிக்கையாளர்கள்','Quotations':'விலைப்புள்ளிகள்','Inventory':'சரக்கு','Accounts':'கணக்குகள்','Customer service':'வாடிக்கையாளர் சேவை','Team & settings':'குழு மற்றும் அமைப்புகள்','Virtual CEO':'மெய்நிகர் தலைமை நிர்வாகி','My enquiries':'எனது விசாரணைகள்','My quotations':'எனது விலைப்புள்ளிகள்','My orders':'எனது ஆர்டர்கள்','Profile & settings':'சுயவிவரம் மற்றும் அமைப்புகள்','Find a distributor':'விநியோகஸ்தரைக் கண்டறியவும்','Product categories':'பொருள் வகைகள்','Home':'முகப்பு','Customer dashboard':'வாடிக்கையாளர் முகப்பு','Compare quotations':'விலைப்புள்ளிகளை ஒப்பிடுக','Installation progress':'நிறுவல் முன்னேற்றம்','Leads & CRM':'வாய்ப்புகள் மற்றும் வாடிக்கையாளர்கள்','Projects & installations':'திட்டங்கள் மற்றும் நிறுவல்கள்'}
};

Object.assign(translations.ml,{'Company setup':'കമ്പനി സജ്ജീകരണം','Brand identity':'ബ്രാൻഡ് രൂപം','Team':'ടീം','Platform administration':'പ്ലാറ്റ്ഫോം നിയന്ത്രണം'});
Object.assign(translations.ta,{'Company setup':'நிறுவன அமைப்பு','Brand identity':'பிராண்ட் அடையாளம்','Team':'குழு','Platform administration':'தள நிர்வாகம்'});
Object.assign(translations.ml,{'Energy catalogue':'ഊർജ ഉൽപ്പന്നങ്ങൾ','My offers':'എന്റെ ഉൽപ്പന്ന ഓഫറുകൾ','Service areas':'സേവന മേഖലകൾ'});
Object.assign(translations.ta,{'Energy catalogue':'ஆற்றல் பொருட்கள்','My offers':'எனது விற்பனைப் பட்டியல்கள்','Service areas':'சேவைப் பகுதிகள்'});
Object.assign(translations.ml,{'Search':'തിരയുക','Next':'അടുത്തത്','Previous':'മുമ്പത്തെത്','Back':'തിരികെ','Notifications':'അറിയിപ്പുകൾ'});
Object.assign(translations.ta,{'Search':'தேடு','Next':'அடுத்து','Previous':'முந்தையது','Back':'பின்செல்','Notifications':'அறிவிப்புகள்'});
function money(value){const amount=BigInt(value??0),n=amount<0n?-amount:amount;return (amount<0n?'-':'')+'₹'+new Intl.NumberFormat('en-IN',{maximumFractionDigits:0}).format(n/100n)+'.'+(n%100n).toString().padStart(2,'0');}
return {text(value,language='en'){return translations[language]?.[value]||value;},money,supported:['en','ml','ta']};
})();
