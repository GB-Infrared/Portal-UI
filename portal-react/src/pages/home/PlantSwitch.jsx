import { useNavigate } from 'react-router-dom';

/**
 * Home · the site's name, and the way out to the site overview.
 *
 * This USED to open a panel of plant cards downward into the header, and the
 * whole apparatus for that was still here long after it stopped running: state
 * that nothing set, a hover timer nothing started, and a grid of plant cards
 * rendered on every paint into a box held permanently at zero height. Dead
 * markup is worse than removed markup, because the next person to read it
 * cannot tell which half of the file is true.
 *
 * WHICH SITE IS ANSWERED IN EXACTLY ONE PLACE, and that place is the site
 * overview. It can show every plant's state at once, side by side, on a picture
 * of where they actually are - which a panel dropped out of one plant's own
 * header never could. Two screens that both answer "which site" is one screen
 * too many, and the one that answers it better should be the one that answers
 * it. So the name is a LINK there, not the lid on a menu.
 *
 * Hovering opens nothing. A header that unfolded because a pointer crossed it
 * was answering a question nobody had asked yet.
 *
 * THE CAPACITY PAIR IS GONE from this header too, and it went for the reason
 * the mockups gave: it is STATIC plant data. It never changed while anybody
 * watched it, and it sat in a row that is otherwise identity and navigation, so
 * two boxed figures beside the name read as two more things to press. A site's
 * nameplate is on its card in the site overview, which is where a site is being
 * chosen and where the number is worth having.
 *
 * @param {Plant}   props.plant   the selected plant
 * @param {Plant[]} props.plants  every plant the user can reach
 */
export function PlantSwitch({ plant, plants }) {
  const list = plants || [];
  const navigate = useNavigate();

  /* one plant and there is nowhere to switch TO, so the name stops being a
     control rather than becoming a control that goes nowhere */
  const switchable = list.length > 1;

  return (
    <section className="planthead">
      <div className="phrow">
        <div className="pname">
          <div className="pswitch">
            <button className="pname-btn" type="button" disabled={!switchable}
                    title={switchable ? 'Switch site · opens the site overview' : undefined}
                    onClick={() => switchable && navigate('/plants')}>
              <span className="n">{(plant && plant.name) || 'No plant selected'}</span>
            </button>
          </div>
          <div className="addr">{(plant && plant.address) || ''}</div>
        </div>
      </div>
    </section>
  );
}
