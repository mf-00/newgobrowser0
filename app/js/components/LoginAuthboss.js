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
import logo from '../../img/logo.svg'
import Alert from 'react-bootstrap/lib/Alert'
import * as actions from '../actions'
import InputGroup from '../components/InputGroup'

export default class LoginAuthboss extends React.Component {
    loginAuthboss() {
        const { web, dispatch, loginRedirectPath } = this.props

        web.LoginAuthboss()
            .then((res) => {
                this.context.router.push(loginRedirectPath)
            })
            .catch(e => {
                dispatch(actions.setLoginError())
                dispatch(actions.showAlert({
                    type: 'danger',
                    message: e.message
                }))
            })
    }

    componentWillMount() {
        const { dispatch } = this.props
        // Clear out any stale message in the alert of previous page
        dispatch(actions.showAlert({type: 'danger', message: ''}))
        document.body.classList.add('is-guest')
    }

    componentWillUnmount() {
        document.body.classList.remove('is-guest')
    }

    hideAlert() {
        const { dispatch } = this.props
        dispatch(actions.hideAlert())
    }

    render() {
        const { alert } = this.props
        let alertBox = <Alert className={'alert animated ' + (alert.show ? 'fadeInDown' : 'fadeOutUp')} bsStyle={alert.type}
                              onDismiss={this.hideAlert.bind(this)}>
            <div className='text-center'>{alert.message}</div>
        </Alert>
        // Make sure you don't show a fading out alert box on the initial web-page load.
        if (!alert.message) alertBox = ''

        this.loginAuthboss()

        return (
            <div className="login">
                {alertBox}
            </div>
        )
    }
}

LoginAuthboss.contextTypes = {
    router: React.PropTypes.object.isRequired
}
