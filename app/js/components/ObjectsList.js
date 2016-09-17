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
import Moment from 'moment'
import humanize from 'humanize'
import connect from 'react-redux/lib/components/connect'

let ObjectsList = ({ objects, currentPath, selectPrefix, dataType, removeObject, loadPath }) => {
    const list = objects.map((object, i) => {
        let size = object.name.endsWith('/') ? '-' : humanize.filesize(object.size)
        let lastModified = object.name.endsWith('/') ? '-' : Moment(object.lastModified).format('lll')
        let loadingClass = loadPath === `${currentPath}${object.name}` ? 'fesl-loading' : ''
        return (
            <div key={i} className={"fesl-row " + loadingClass} data-type={dataType(object.name, object.contentType)}>

                {loadPath === `${currentPath}${object.name}` ? <span className="loading l-listing"><i /></span> : ''}

                <div className="fesl-item fi-name">
                    <a href="" onClick={(e) => selectPrefix(e, `${currentPath}${object.name}`)}>
                        {object.name}
                    </a>
                </div>
                <div className="fesl-item fi-size">{size}</div>
                <div className="fesl-item fi-modified">{lastModified}</div>
            </div>
        )
    })
    return (
        <div>{list}</div>
    )
}

// Subscribe it to state changes.
export default connect(state => {
    return { objects: state.objects, currentPath: state.currentPath, loadPath: state.loadPath }
})(ObjectsList)
