
/// <reference path="../../typings/index.d.ts" />
import * as hkBridge from '../../shared/yahka.configuration';
import * as $ from "jquery";
import { ConfigPageBuilder_Base, IConfigPageBuilder, IConfigPageBuilderDelegate, TValidatorFunction } from './pageBuilder.base';
import { translateFragment } from '../admin.translation';
import { createTemplateElement } from '../admin.pageLoader';
import { IDictionary } from '../../shared/yahka.configuration';
import { ISelectListEntry } from '../admin.config';
import { ioBrokerInterfaceList } from '../yahka.admin';

export class ConfigPageBuilder_IPCamera extends ConfigPageBuilder_Base implements IConfigPageBuilder {
    public addServiceAvailable: boolean = false;
    public removeDeviceAvailable: boolean = true;
    public dupliacteDeviceAvailable: boolean = true;
    configPanelTemplate: HTMLTemplateElement;
    constructor(protected delegate: IConfigPageBuilderDelegate) {
        super(delegate);
        this.configPanelTemplate = createTemplateElement(require('./pageBuilder.ipCam.main.inc.html'));
    }

    public async refresh(config: hkBridge.Configuration.IBaseConfigNode, AFocusLastPanel: boolean, devicePanel: HTMLElement) {
        if (!hkBridge.Configuration.isIPCameraConfig(config)) {
            return
        }

        let configFragment = <DocumentFragment>document.importNode(this.configPanelTemplate.content, true);
        translateFragment(configFragment);

        let inputHelper = (selector: string, propertyName: keyof hkBridge.Configuration.ICameraConfig, selectList?: IDictionary<ISelectListEntry> | ISelectListEntry[], validator: TValidatorFunction = undefined) => {
            let input = <HTMLSelectElement>configFragment.querySelector(selector);
            let errorElement = <HTMLElement>configFragment.querySelector(selector + '_error');
            this.fillSelectByListEntries(input, selectList);
            let value = config[propertyName];
            if (input.type === 'checkbox') {
                input.checked = value === undefined ? true : value;
                input.addEventListener('change', this.handlePropertyChange.bind(this, config, propertyName, errorElement, validator))
            } else {
                if (value !== undefined) {
                    input.value = value.toString();
                } else {
                    input.value = '';
                }
                input.addEventListener('input', this.handlePropertyChange.bind(this, config, propertyName, errorElement, validator));
            }
            this.refreshSimpleErrorElement(errorElement, validator);
        };

        let ffmpegHelper = (selector: string, propertyName: keyof hkBridge.Configuration.ICameraFfmpegCommandLine) => {
            let input = <HTMLTextAreaElement>configFragment.querySelector(selector);
            let inputErrorMsg = <HTMLElement>configFragment.querySelector(selector + '_error');

            let value = config.ffmpegCommandLine[propertyName];
            if (value !== undefined) {
                input.value = JSON.stringify(value, null, 2);
            } else {
                input.value = '';
            }
            input.addEventListener('input', this.handleffMpegPropertyChange.bind(this, config, propertyName, inputErrorMsg));

        };

        inputHelper('#enabled', 'enabled');
        inputHelper('#name', 'name', undefined, () => !this.delegate.deviceIsUnique(config));
        inputHelper('#manufacturer', 'manufacturer');
        inputHelper('#model', 'model');
        inputHelper('#serial', 'serial');
        inputHelper('#firmware', 'firmware');
        inputHelper('#username', 'username');
        inputHelper('#pincode', 'pincode');
        inputHelper('#port', 'port');
        let ipList = await ioBrokerInterfaceList;
        let ipListForSelectBox = ipList.filter((a) => a.family === "ipv4").map((a) => { return { value: a.address, text: a.name }; });
        inputHelper('#interface', 'interface', ipListForSelectBox);

        inputHelper('#source', 'source');
        inputHelper('#codec', 'codec');
        inputHelper('#numberOfStreams', 'numberOfStreams');
        inputHelper('#maxWidth', 'maxWidth');
        inputHelper('#maxHeight', 'maxHeight');
        inputHelper('#maxFPS', 'maxFPS');

        ffmpegHelper('#ffmpeg_snapshot', 'snapshot');
        ffmpegHelper('#ffmpeg_stream', 'stream');

        devicePanel.appendChild(configFragment);
    }

    public styleListItem(listItem: HTMLElement, deviceConfig: hkBridge.Configuration.IBaseConfigNode): boolean {
        if (!hkBridge.Configuration.isIPCameraConfig(deviceConfig)) {
            return false;
        }

        let listIcon = listItem.querySelector('.list-icon');
        listIcon.className = 'list-icon icon mif-camera';
        listItem.classList.toggle('fg-grayLight', !deviceConfig.enabled);
        listItem.classList.toggle('fg-grayDark', deviceConfig.enabled);
        return true;
    }

    handlePropertyChange(config: hkBridge.Configuration.ICameraConfig, propertyName: keyof hkBridge.Configuration.ICameraConfig, errorElement: HTMLElement, validator: TValidatorFunction, ev: Event) {
        let inputTarget = <HTMLInputElement>ev.currentTarget;
        if (inputTarget.type == "checkbox") {
            config[propertyName] = inputTarget.checked;
        } else {
            config[propertyName] = inputTarget.value;
        }
        this.refreshSimpleErrorElement(errorElement, validator);
        this.delegate.refreshDeviceListEntry(config);
        this.delegate.changeCallback();
    }

    displayExceptionHint(textArea: HTMLTextAreaElement, msgPanel: HTMLElement, message: string | undefined) {
        textArea.classList.toggle('validationError', message !== undefined);
        msgPanel.classList.toggle('validationError', message !== undefined);
        msgPanel.innerText = message
    }



    handleffMpegPropertyChange(config: hkBridge.Configuration.ICameraConfig, propertyName: keyof hkBridge.Configuration.ICameraFfmpegCommandLine, inputErrorMsgPanel: HTMLElement, ev: Event) {
        let inputTarget = <HTMLTextAreaElement>ev.currentTarget;
        try {
            config.ffmpegCommandLine[propertyName] = JSON.parse(inputTarget.value);
            this.displayExceptionHint(inputTarget, inputErrorMsgPanel, undefined)
        } catch (e) {
            this.displayExceptionHint(inputTarget, inputErrorMsgPanel, e.message)
        }
        this.delegate.refreshDeviceListEntry(config);
        this.delegate.changeCallback();
    }
}
