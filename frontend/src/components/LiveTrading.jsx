import{Activity} from 'lucide-react';
function LiveTrading(){
    return(
        <div className='p-8'>
            <hi className="text-2xl font-bold mb-4 flex item-center gap-2">
                <Activity className='text-red-500'/>
                실제 투자
            </hi>
        </div>
    );
}
export default LiveTrading;