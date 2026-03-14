import Toybox.Application;
import Toybox.WatchUi;

class StreakApp extends Application.AppBase {

    function initialize() {
        AppBase.initialize();
    }

    function getInitialView() as [Views] or [Views, InputDelegates] {
        return [new StreakView(), new StreakDelegate()];
    }
}
