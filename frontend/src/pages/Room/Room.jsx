import React, { useState, useEffect } from 'react';
import styles from './Room.module.css';
import { useSelector } from 'react-redux';
//import { getRoom } from '../../http';
import { useParams, useNavigate } from 'react-router-dom';
import { useWebRTC } from '../../hooks/useWebRTC';


const Room = () => {
    const { id: roomId } = useParams();
    const user = useSelector((state) => state.auth.user);
    const { clients, provideRef } = useWebRTC(roomId,user);
    
    

  return (
    <div>
        <h1>All connected Clients</h1>
        {clients.map((client) => {
            return (<div key ={client.id} className={styles.userHead}>
                
                
                <img src={client.avatar} className = {styles.userAvatar} alt="avatar" />
                <audio 
                ref = {(instance)=>{
                    provideRef(instance, client.id)
                }}
                playsInline
                controls 
                autoPlay ></audio>
                <h2>{client.name}</h2>
            </div>)
        })}
    </div>
  )
}

export default Room