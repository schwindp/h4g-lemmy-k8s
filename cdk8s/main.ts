import {App} from 'cdk8s';
import {LemmyChart} from "./lemmy";
import {appProps} from "./app-props";


const app = new App();
new LemmyChart(app, 'lemmy', appProps); //TODO common labels
app.synth();
