/*
 * Minio Browser (C) 2016 Minio, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import React from 'react'
import classNames from 'classnames'
import browserHistory from 'react-router/lib/browserHistory'
import connect from 'react-redux/lib/components/connect'
import humanize from 'humanize'
import Moment from 'moment'
import Modal from 'react-bootstrap/lib/Modal'
import ModalBody from 'react-bootstrap/lib/ModalBody'
import ModalHeader from 'react-bootstrap/lib/ModalHeader'
import Alert from 'react-bootstrap/lib/Alert'
import OverlayTrigger from 'react-bootstrap/lib/OverlayTrigger'
import Tooltip from 'react-bootstrap/lib/Tooltip'
import Dropdown from 'react-bootstrap/lib/Dropdown'
import MenuItem from 'react-bootstrap/lib/MenuItem'

import InputGroup from '../components/InputGroup'
import Dropzone from '../components/Dropzone'
import ObjectsList from '../components/ObjectsList'
import SideBar from '../components/SideBar'
import Path from '../components/Path'
import BrowserUpdate from '../components/BrowserUpdate'
import UploadModal from '../components/UploadModal'
import SettingsModal from '../components/SettingsModal'

import logo from '../../img/logo.svg'

import * as actions from '../actions'
import * as utils from '../utils'
import * as mime from '../mime'
import { minioBrowserPrefix } from '../constants'

export default class Browse extends React.Component {
    componentDidMount() {
        const { web, dispatch, currentBucket } = this.props
        web.StorageInfo()
            .then(res => {
                let storageInfo = Object.assign({}, {
                    total: res.storageInfo.Total,
                    free: res.storageInfo.Free
                })
                storageInfo.used = storageInfo.total - storageInfo.free
                dispatch(actions.setStorageInfo(storageInfo))
                return web.ServerInfo()
            })
            .then(res => {
                let serverInfo = Object.assign({}, {
                    version: res.MinioVersion,
                    memory: res.MinioMemory,
                    platform: res.MinioPlatform,
                    runtime: res.MinioRuntime,
                    envVars: res.MinioEnvVars
                })
                dispatch(actions.setServerInfo(serverInfo))
            })
            .catch(err => {
                dispatch(actions.showAlert({type: 'danger', message: err.message}))
            })
    }

    componentWillMount() {
      const { dispatch } = this.props
      // Clear out any stale message in the alert of Login page
      dispatch(actions.showAlert({type: 'danger', message: ''}))
      web.ListBuckets()
          .then(res => {
            let buckets
            if (!res.buckets) buckets = []
            else buckets = res.buckets.map(bucket => bucket.name)
            if (buckets.length) {
              dispatch(actions.setBuckets(buckets))
              dispatch(actions.setVisibleBuckets(buckets))
              if (location.pathname === minioBrowserPrefix || location.pathname === minioBrowserPrefix + '/') {
                browserHistory.push(utils.pathJoin(buckets[0]))
              }
            }
          })
      this.history = browserHistory.listen(({pathname}) => {
        if (pathname === `${minioBrowserPrefix}/login`) return // FIXME: better organize routes and remove this
        if (!pathname.endsWith('/')) pathname += '/'
        if (pathname === minioBrowserPrefix + '/') {
          dispatch(actions.setCurrentBucket(''))
          dispatch(actions.setCurrentPath(''))
          dispatch(actions.setObjects([]))
          return
        }
        let obj = utils.pathSlice(pathname)
        dispatch(actions.selectBucket(obj.bucket, obj.prefix))
      })
    }

    componentWillUnmount() {
      this.history()
    }

    selectBucket(e, bucket) {
        e.preventDefault()
        if (bucket === this.props.currentBucket) return
        browserHistory.push(utils.pathJoin(bucket))
    }

    searchBuckets(e) {
        e.preventDefault()
        let { buckets } = this.props
        this.props.dispatch(actions.setVisibleBuckets(buckets.filter(bucket => bucket.indexOf(e.target.value) > -1)))
    }

    selectPrefix(e, prefix) {
        const { dispatch, currentPath, web, currentBucket } = this.props
        e.preventDefault()
        if (prefix.endsWith('/') || prefix === '') {
            if (prefix === currentPath) return
            browserHistory.push(utils.pathJoin(currentBucket, prefix))
        } else {
            window.location = `${window.location.origin}/minio/download/${currentBucket}/${prefix}?token=${localStorage.token}`
        }
    }

    makeBucket(e) {
        e.preventDefault()
        const bucketName = this.refs.makeBucketRef.value
        this.refs.makeBucketRef.value = ''
        const { web, dispatch } = this.props
        this.hideMakeBucketModal()
        web.MakeBucket({bucketName})
            .then(() => {
              dispatch(actions.addBucket(bucketName))
              dispatch(actions.selectBucket(bucketName))
            })
            .catch(err => dispatch(actions.showAlert({
                type: 'danger',
                message: err.message
            })))
    }

    hideMakeBucketModal() {
        const { dispatch } = this.props
        dispatch(actions.hideMakeBucketModal())
    }

    showMakeBucketModal(e) {
        e.preventDefault()
        const { dispatch } = this.props
        dispatch(actions.showMakeBucketModal())
    }

    showAbout(e) {
        e.preventDefault()
        const { dispatch } = this.props
        dispatch(actions.showAbout())
    }

    hideAbout() {
        const { dispatch } = this.props
        dispatch(actions.hideAbout())
    }

    showBucketPolicy() {
        const { dispatch } = this.props
        dispatch(actions.showBucketPolicy())
    }

    hideBucketPolicy(e) {
        e.preventDefault()
        const { dispatch } = this.props
        dispatch(actions.hideBucketPolicy())
    }

    uploadFile(e) {
        e.preventDefault()
        const { dispatch } = this.props

        let file = e.target.files[0]
        e.target.value = null
        this.xhr = new XMLHttpRequest ()
        dispatch(actions.uploadFile(file, this.xhr))
    }

    removeObject(e, object) {
      const { web, dispatch, currentBucket, currentPath } = this.props
      web.RemoveObject({
        bucketName: currentBucket,
        objectName: currentPath + object.name
      })
      .then(() => dispatch(actions.selectPrefix(currentPath)))
      .catch(e => dispatch(actions.showAlert({
        type: 'danger',
        message: e.message
      })))
    }

    hideAlert() {
        const { dispatch } = this.props
        dispatch(actions.hideAlert())
    }

    dataType(name, contentType) {
      return mime.getDataType(name, contentType)
    }

    sortObjectsByName(e) {
        const { dispatch, objects, sortNameOrder } = this.props
        dispatch (actions.setObjects(utils.sortObjectsByName(objects, !sortNameOrder)))
        dispatch (actions.setSortNameOrder(!sortNameOrder))
    }

    sortObjectsBySize() {
        const { dispatch, objects, sortSizeOrder } = this.props
        dispatch (actions.setObjects(utils.sortObjectsBySize(objects, !sortSizeOrder)))
        dispatch (actions.setSortSizeOrder(!sortSizeOrder))
    }

    sortObjectsByDate() {
        const { dispatch, objects, sortDateOrder } = this.props
        dispatch (actions.setObjects(utils.sortObjectsByDate(objects, !sortDateOrder)))
        dispatch (actions.setSortDateOrder(!sortDateOrder))
    }

    logout(e) {
        const { web } = this.props
        e.preventDefault()
        web.Logout()
        browserHistory.push(`${minioBrowserPrefix}/login`)
    }

    landingPage(e) {
        e.preventDefault()
        this.props.dispatch(actions.selectBucket(this.props.buckets[0]))
    }

    fullScreen(e) {
        e.preventDefault()
        let el = document.documentElement
        if (el.requestFullscreen) {
            el.requestFullscreen()
        }
        if (el.mozRequestFullScreen) {
            el.mozRequestFullScreen()
        }
        if (el.webkitRequestFullscreen) {
            el.webkitRequestFullscreen()
        }
        if (el.msRequestFullscreen) {
            el.msRequestFullscreen()
        }
    }

    multiSelect(e) {
        alert('yes')
    }

    toggleSidebar(status){
        this.props.dispatch(actions.setSidebarStatus(status))
    }

    hideSidebar(event){
        let e = event || window.event;

        // Support all browsers.
        let target = e.srcElement || e.target;
        if (target.nodeType === 3) // Safari support.
            target = target.parentNode;

        let targetID = target.id;
        if (!(targetID === 'mh-trigger')) {
            this.props.dispatch(actions.setSidebarStatus(false))
        }
    }

    showSettings(e) {
        e.preventDefault()

        const { dispatch } = this.props
        dispatch(actions.showSettings())
    }

    render() {
        const { total, free } = this.props.storageInfo
        const { showMakeBucketModal, alert, sortNameOrder, sortSizeOrder, sortDateOrder, showAbout, showBucketPolicy } = this.props
        const { version, memory, platform, runtime } = this.props.serverInfo
        const { sidebarStatus } = this.props
        const { showSettings } = this.props

        // Don't always show the SettingsModal. This is done here instead of in
        // SettingsModal.js so as to allow for #componentWillMount to handle
        // the loading of the settings.
        let settingsModal = showSettings ? <SettingsModal /> : <noscript></noscript>

        let alertBox = <Alert className={classNames({
                                          'alert': true,
                                          'animated': true,
                                          'fadeInDown': alert.show,
                                          'fadeOutUp': !alert.show
                                        })} bsStyle={alert.type} onDismiss={this.hideAlert.bind(this)}>
                            <div className='text-center'>
                                {alert.message}
                            </div>
                        </Alert>
        // Make sure you don't show a fading out alert box on the initial web-page load.
        if (!alert.message) alertBox = ''

        let signoutTooltip = <Tooltip id="tt-sign-out">Sign out</Tooltip>
        let uploadTooltip = <Tooltip id="tt-upload-file">Upload file</Tooltip>
        let makeBucketTooltip = <Tooltip id="tt-create-bucket">Create bucket</Tooltip>

        let used = total - free
        let usedPercent = (used / total) * 100+'%'
        let freePercent = free * 100 / total
        return (
            <div className={classNames({'file-explorer': true, 'toggled': sidebarStatus})}>
                <SideBar landingPage={this.landingPage.bind(this)}
                            searchBuckets={this.searchBuckets.bind(this)}
                            selectBucket={this.selectBucket.bind(this)}
                            clickOutside={this.hideSidebar.bind(this)}
                            showPolicy={this.showBucketPolicy.bind(this)}/>

                <div className="fe-body">
                    <Dropzone>
                    {alertBox}

                    <header className="mobile-header hidden-lg hidden-md">
                        <div id="mh-trigger" className={'mh-trigger '+ (classNames({'mht-toggled': sidebarStatus}))} onClick={this.toggleSidebar.bind(this, !sidebarStatus)}>
                            <div className="mht-lines">
                                <div className="top"></div>
                                <div className="center"></div>
                                <div className="bottom"></div>
                            </div>
                        </div>

                        <img className="mh-logo" src={logo} alt=""/>
                    </header>

                    <header className="fe-header">
                        <Path selectPrefix={this.selectPrefix.bind(this)}/>

                        <div className="feh-usage">
                            <div className="fehu-chart">
                                <div style={{width: usedPercent}}></div>
                            </div>

                            <ul>
                                <li>Used: {humanize.filesize(total - free)}</li>
                                <li className="pull-right">Free: {humanize.filesize(total - used)}</li>
                            </ul>
                        </div>

                        <ul className="feh-actions">
                            <BrowserUpdate />
                            <li>
                                <Dropdown pullRight id="top-right-menu">
                                    <Dropdown.Toggle noCaret>
                                        <i className="fa fa-reorder"></i>
                                    </Dropdown.Toggle>
                                    <Dropdown.Menu className="dm-right">
                                        <li>
                                            <a target="_blank" href="https://github.com/minio/miniobrowser">Github <i className="fa fa-github"></i></a>
                                        </li>
                                        <li>
                                            <a href="" onClick={this.fullScreen.bind(this)}>Fullscreen <i className="fa fa-expand"></i></a>
                                        </li>
                                        <li>
                                            <a target="_blank" href="https://gitter.im/minio/minio">Ask for help <i className="fa fa-question-circle"></i></a>
                                        </li>
                                        <li>
                                            <a href="" onClick={this.showAbout.bind(this)}>About <i className="fa fa-info-circle"></i></a>
                                        </li>
                                        <li>
                                            <a href="" onClick={this.showSettings.bind(this)}>Settings <i className="fa fa-cog"></i></a>
                                        </li>
                                        <li>
                                            <a href="" onClick={this.logout.bind(this)}>Sign Out <i className="fa fa-sign-out"></i></a>
                                        </li>
                                    </Dropdown.Menu>
                                </Dropdown>
                            </li>
                        </ul>
                    </header>
                    <div className="feb-container">
                        <header className="fesl-row" data-type="folder">
                            <div className="fesl-item fi-name" onClick={this.sortObjectsByName.bind(this)} data-sort="name">
                              Name
                              <i className={classNames({
                                  'fesli-sort': true,
                                  'fa': true,
                                  'fa-sort-alpha-desc': sortNameOrder,
                                  'fa-sort-alpha-asc': !sortNameOrder
                                })}/>
                            </div>
                            <div className="fesl-item fi-size" onClick={this.sortObjectsBySize.bind(this)} data-sort="size">
                              Size
                              <i className={classNames({
                                  'fesli-sort': true,
                                  'fa': true,
                                  'fa-sort-amount-desc': sortSizeOrder,
                                  'fa-sort-amount-asc': !sortSizeOrder
                                })}/>
                            </div>
                            <div className="fesl-item fi-modified" onClick={this.sortObjectsByDate.bind(this)} data-sort="last-modified">
                              Last Modified
                              <i className={classNames({
                                  'fesli-sort': true,
                                  'fa': true,
                                  'fa-sort-numeric-desc': sortDateOrder,
                                  'fa-sort-numeric-asc': !sortDateOrder
                                })}/>
                            </div>
                        </header>
                    </div>

                    <div className="feb-container">
                        <ObjectsList dataType={this.dataType.bind(this)} selectPrefix={this.selectPrefix.bind(this)}/>
                    </div>

                    <UploadModal />

                    <Dropdown dropup className="feb-actions" id="fe-action-toggle">
                        <Dropdown.Toggle noCaret className="feba-toggle">
                            <span><i className="fa fa-plus"></i></span>
                        </Dropdown.Toggle>
                        <Dropdown.Menu>
                            <OverlayTrigger placement="left" overlay={uploadTooltip}>
                                <a href="#" className="feba-btn feba-upload">
                                    <input type="file" onChange={this.uploadFile.bind(this)} style={{display:'none'}}
                                           id="file-input"></input>
                                    <label htmlFor="file-input">
                                        <i style={{cursor:'pointer'}} className="fa fa-cloud-upload"></i>
                                    </label>
                                </a>
                            </OverlayTrigger>
                            <OverlayTrigger placement="left" overlay={makeBucketTooltip}>
                                <a href="#" className="feba-btn feba-bucket"
                                   onClick={this.showMakeBucketModal.bind(this)}>
                                    <i className="fa fa-hdd-o"></i>
                                </a>
                            </OverlayTrigger>
                        </Dropdown.Menu>
                    </Dropdown>

                    <Modal className="feb-modal" animation={false} show={showMakeBucketModal} onHide={this.hideMakeBucketModal.bind(this)}>

                        <button className="close" onClick={this.hideMakeBucketModal.bind(this)}><span>&times;</span></button>

                        <ModalBody>
                            <form onSubmit={this.makeBucket.bind(this)}>
                                <div className="create-bucket">
                                    <input type="text" ref="makeBucketRef" placeholder="Bucket Name" autoFocus/>
                                    <i></i>
                                </div>
                            </form>
                        </ModalBody>
                    </Modal>

                    <Modal className="about-modal modal-dark" show={showAbout} onHide={this.hideAbout.bind(this)}>
                        <div className="am-inner">
                            <div className="ami-item hidden-xs">
                                <a href="https://minio.io" target="_blank">
                                   <img className="amii-logo" src={logo} alt=""/>
                                </a>
                            </div>
                            <div className="ami-item">
                                <ul className="amii-list">
                                    <li>
                                        <div>Version</div>
                                        <small>{version}</small>
                                    </li>
                                    <li>
                                        <div>Memory</div>
                                        <small>{memory}</small>
                                    </li>
                                    <li>
                                        <div>Platform</div>
                                        <small>{platform}</small>
                                    </li>
                                    <li>
                                        <div>Runtime</div>
                                        <small>{runtime}</small>
                                    </li>
                                </ul>

                                <div className="modal-footer p-0 p-t-10 text-left">
                                    <a href="" className="mf-btn" onClick={this.hideAbout.bind(this)}>
                                        <i className="fa fa-check"></i>
                                    </a>
                                </div>
                            </div>
                        </div>
                    </Modal>

                    <Modal className="policy-modal" show={showBucketPolicy} onHide={this.hideBucketPolicy.bind(this)}>
                        <ModalHeader>
                            Bucket Policy
                            <small>Cras justo odio, dapibus ac facilisis in, egestas eget quam.</small>

                            <a href="" className="mh-close" onClick={this.hideBucketPolicy.bind(this)}>
                                <i className="fa fa-times"></i>
                            </a>
                        </ModalHeader>

                        <div className="pm-body">
                            <header className="pmb-list">
                                <div className="pmbl-item">
                                    <input type="text" className="form-control" value="bucket"/>
                                </div>
                                <div className="pmbl-item">
                                    <select className="form-control">
                                        <option>Read Only</option>
                                        <option>Write Only</option>
                                        <option>Read and Write</option>
                                    </select>
                                </div>
                                <div className="pmbl-item">
                                    <a href="" className="btn btn-sm btn-block btn-primary">Add</a>
                                </div>
                            </header>

                            <div className="pmb-list">
                                <div className="pmbl-item">bucket/photos</div>
                                <div className="pmbl-item">
                                    <select className="form-control">
                                        <option>Read Only</option>
                                        <option>Write Only</option>
                                        <option>Read and Write</option>
                                    </select>
                                </div>
                                <div className="pmbl-item">
                                    <a href="" className="btn btn-sm btn-block btn-danger">Remove</a>
                                </div>
                            </div>

                            <div className="pmb-list">
                                <div className="pmbl-item">bucket/photos</div>
                                <div className="pmbl-item">
                                    <select className="form-control">
                                        <option>Read Only</option>
                                        <option>Write Only</option>
                                        <option>Read and Write</option>
                                    </select>
                                </div>
                                <div className="pmbl-item">
                                    <a href="" className="btn btn-sm btn-block btn-danger">Remove</a>
                                </div>
                            </div>

                            <div className="pmb-list">
                                <div className="pmbl-item">bucket/photos</div>
                                <div className="pmbl-item">
                                    <select className="form-control">
                                        <option>Read Only</option>
                                        <option>Write Only</option>
                                        <option>Read and Write</option>
                                    </select>
                                </div>
                                <div className="pmbl-item">
                                    <a href="" className="btn btn-sm btn-block btn-danger">Remove</a>
                                </div>
                            </div>

                            <div className="pmb-list">
                                <div className="pmbl-item">bucket/photos</div>
                                <div className="pmbl-item">
                                    <select className="form-control">
                                        <option>Read Only</option>
                                        <option>Write Only</option>
                                        <option>Read and Write</option>
                                    </select>
                                </div>
                                <div className="pmbl-item">
                                    <a href="" className="btn btn-sm btn-block btn-danger">Remove</a>
                                </div>
                            </div>
                        </div>
                    </Modal>

                    { settingsModal }

                    </Dropzone>
                </div>
            </div>
        )
    }
}
