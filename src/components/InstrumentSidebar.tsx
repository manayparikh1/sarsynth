import { LEFT_INSTRUMENTS, RIGHT_INSTRUMENTS } from '../instrumentInfo';

interface Props {
    side: 'left' | 'right';
    onSelect: (name: string) => void;
}

export function InstrumentSidebar({ side, onSelect }: Props) {
    const items = side === 'left' ? LEFT_INSTRUMENTS : RIGHT_INSTRUMENTS;
    return (
        <div className={`instrument-sidebar ${side}`}>
            {items.map((item) => (
                <button className="instrument-card" key={item.name} onClick={() => onSelect(item.name)}>
                    <img className="instrument-img" src={item.img} alt={item.name} />
                    <span className="instrument-text">
                        <h4 className="instrument-name">{item.name}</h4>
                        <p className="instrument-history">{item.history}</p>
                    </span>
                </button>
            ))}
        </div>
    );
}
