export default function Modal({children,onClose,width}){
  return(<div className="position-fixed d-flex align-items-center justify-content-center" style={{inset:0,zIndex:1050,background:'rgba(0,0,0,0.6)'}} onClick={onClose}>
    <div className="bg-card border border-military rounded p-3 m-2" style={{maxWidth:width||400,width:'100%',maxHeight:'85vh',overflowY:'auto'}} onClick={e=>e.stopPropagation()}>{children}</div>
  </div>);
}
