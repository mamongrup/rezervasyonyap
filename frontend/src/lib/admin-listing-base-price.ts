export type EditableBaseRule = {id:string;rule_json:string;valid_from?:string|null;valid_to?:string|null};
function readRule(rule:EditableBaseRule):Record<string,unknown>{try{const v=JSON.parse(rule.rule_json);return v&&typeof v==='object'&&!Array.isArray(v)?v:{}}catch{return {}}}
export function defaultBasePriceRule<T extends EditableBaseRule>(rules:T[]):T|undefined {
  return rules.find(r=>!r.valid_from&&!r.valid_to&&readRule(r).manual_starting_price===true)
    ?? rules.find(r=>!r.valid_from&&!r.valid_to&&Number(readRule(r).base_nightly)>0);
}
export function manualBasePriceRuleJson(rule:EditableBaseRule|undefined,amount:string,unit:string):string {
  const value=Number(amount.trim().replace(',','.'));if(!Number.isFinite(value)||value<=0)throw Error('invalid_starting_price');
  const rounded=Math.round((value+Number.EPSILON)*100)/100;if(rounded<=0)throw Error('invalid_starting_price');return JSON.stringify({...(rule?readRule(rule):{}),base_nightly:rounded,manual_starting_price:true,price_unit:unit,pricing_basis:'manual_sale_amount'});
}
const copy={
tr:{periodEditHint:"Bu tedarikçi turunun fiyatlarını Tur Tarihleri & Fiyat adımında hareket tarihine göre düzenleyin.",title:'Tur başlangıç fiyatı',currency:'Para birimi',label:'Kişi başı başlangıç fiyatı',hint:'Tur paketi için kişi başı satış tutarıdır; gecelik ücret değildir. Kesin fiyat ve müsaitlik seçilen hareket tarihinde ayrıca doğrulanır.'},
en:{periodEditHint:"Edit supplier tour prices by departure in the Tour Dates & Price step.",title:'Tour starting price',currency:'Currency',label:'Starting price per person',hint:'Sale amount per person for the tour package, rather than a nightly rate. Final price and availability are checked for the selected departure.'},
de:{periodEditHint:"Bearbeiten Sie die Anbieterpreise je Abreise im Schritt Reisetermine und Preise.",title:'Tourpreis ab',currency:'Währung',label:'Startpreis pro Person',hint:'Verkaufspreis pro Person für das Reisepaket. Endpreis und Verfügbarkeit werden für den gewählten Abreisetermin geprüft.'},
ru:{periodEditHint:"Изменяйте цены поставщика по датам в разделе «Даты и цены тура».",title:'Начальная стоимость тура',currency:'Валюта',label:'Начальная цена на человека',hint:'Цена продажи турпакета на человека. Итоговая цена и наличие мест проверяются для выбранной даты выезда.'},
zh:{periodEditHint:"请在“出发日期和价格”步骤中按出发日期修改供应商价格。",title:'旅游起价',currency:'货币',label:'每人起价',hint:'此金额为旅游套餐每人的销售价格。最终价格和余位需根据所选出发日期核实。'},
fr:{periodEditHint:"Modifiez les prix fournisseur par départ dans l’étape Dates et prix du circuit.",title:'Prix de départ du circuit',currency:'Devise',label:'Prix de départ par personne',hint:'Prix de vente du forfait par personne. Le prix définitif et les disponibilités sont vérifiés pour le départ choisi.'}
};
export function tourAdminPricingCopy(locale:string){return (copy as Record<string,typeof copy.tr>)[locale]??copy.tr}
